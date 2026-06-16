/**
 * AI 词典查词服务
 *
 * 三层查询路径：持久化 AI 词典（localStorage）→ 内存 LRU 缓存 → LLM API 兜底
 * 查到的结果自动持久化，越用越省 token。
 */
import type { Settings } from '../store/settingsStore'
import { callLLM } from './llm'

/** 查词结果内存缓存（LRU，500 上限），避免重复走 LLM */
const lookupCache = new Map<string, { word: string; phonetic?: string; meanings: string[] }>()

/** localStorage key for 持久化 AI 词典 */
const AI_DICTIONARY_KEY = 'linguachat-ai-dictionary'

/**
 * LRU 淘汰：Map 超出上限时移除最早插入的 key
 */
function lruEvictIfNeeded(map: Map<unknown, unknown>, maxSize: number): void {
  while (map.size > maxSize) {
    const firstKey = map.keys().next().value
    if (firstKey) map.delete(firstKey)
    else break
  }
}

/**
 * 惰性加载持久化 AI 词典（localStorage），越用越省 token
 * 结构: Map<cacheKey, { word, phonetic, meanings }>
 */
function loadPersistedDictionary(): Map<string, { word: string; phonetic?: string; meanings: string[] }> {
  try {
    const raw = localStorage.getItem(AI_DICTIONARY_KEY)
    if (raw) {
      const entries = JSON.parse(raw)
      if (Array.isArray(entries)) {
        return new Map(entries)
      }
    }
  } catch (e) {
    console.warn('Memo: AI 词典加载失败', e)
  }
  return new Map()
}

/** 将一条查词记录持久化到 localStorage */
function persistLookupEntry(
  key: string,
  entry: { word: string; phonetic?: string; meanings: string[] },
  maxSize: number
): void {
  try {
    const dict = loadPersistedDictionary()
    dict.set(key, entry)
    // FIFO：超出上限时丢弃最早插入的词条
    while (dict.size > maxSize) {
      const firstKey = dict.keys().next().value
      if (firstKey) dict.delete(firstKey)
    }
    localStorage.setItem(AI_DICTIONARY_KEY, JSON.stringify([...dict]))
  } catch (e) {
    console.warn('Memo: AI 词典持久化写入失败', e)
  }
}

/** 获取当前 AI 词典的词条数量 */
export function getAiDictionarySize(): number {
  try {
    const raw = localStorage.getItem(AI_DICTIONARY_KEY)
    if (raw) {
      const entries = JSON.parse(raw)
      return Array.isArray(entries) ? entries.length : 0
    }
  } catch (e) {
    console.warn('Memo: getAiDictionarySize 读取 AI 词典失败', e)
  }
  return 0
}

/**
 * 使用 LLM 查询单词释义（替代 Google Translate lookupWord）
 *
 * 查询路径: 持久化 AI 词典 → 内存 LRU 缓存 → LLM API
 */
export async function lookupWordViaLLM(
  word: string,
  nativeLanguage: string,
  targetLanguage: string,
  settings: Settings
): Promise<{ word: string; phonetic?: string; meanings: string[] }> {
  if (!word.trim()) return { word, meanings: [] }
  if (!settings.apiKey) throw new Error('API Key 未配置，无法查词')

  const cacheKey = `${word}:${nativeLanguage}:${targetLanguage}`

  // 1. 查持久化 AI 词典（localStorage，跨会话）
  const persistedDict = loadPersistedDictionary()
  const persisted = persistedDict.get(cacheKey)
  if (persisted) {
    // 顺便预热内存缓存
    if (!lookupCache.has(cacheKey)) {
      lruEvictIfNeeded(lookupCache, 500)
      lookupCache.set(cacheKey, persisted)
    }
    return persisted
  }

  // 2. 查内存 LRU 缓存（同一会话内快速命中）
  const cached = lookupCache.get(cacheKey)
  if (cached) return cached

  const escapedWord = word.replace(/"/g, '\\"')
  const systemPrompt = `你是一个词典助手。请查询单词 "${escapedWord}"，并用${nativeLanguage}给出释义。

返回格式（严格按此 JSON 格式，不要添加额外文字）：
{
  "word": "${escapedWord}",
  "phonetic": "音标（可选）",
  "meanings": ["释义1", "释义2", "释义3"]
}

要求：
- 用 ${nativeLanguage} 给出释义
- meanings 最多 5 条
- 如果不知道音标，phonetic 设为 null`

  const rawResult = await callLLM(settings, {
    systemPrompt,
    messages: [{ role: 'user', content: `请查询单词: ${word}` }],
    temperature: 0.1,
    maxTokens: 300,
  })

  const result = parseWordLookupResult(rawResult, word)
  // 有释义才缓存（内存 LRU + 持久化 AI 词典）
  if (result.meanings.length > 0) {
    lruEvictIfNeeded(lookupCache, 500)
    lookupCache.set(cacheKey, result)
    // 持久化到 localStorage，下次启动直接用
    persistLookupEntry(cacheKey, result, settings.aiDictLimit || 2000)
  }
  return result
}

/** 解析 LLM 返回的 JSON 查词结果 */
function parseWordLookupResult(
  raw: string,
  fallbackWord: string
): { word: string; phonetic?: string; meanings: string[] } {
  try {
    // 尝试从 markdown 代码块中提取 JSON
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim()
    const parsed = JSON.parse(jsonStr)
    return {
      word: parsed.word || fallbackWord,
      phonetic: parsed.phonetic || undefined,
      meanings: Array.isArray(parsed.meanings) ? parsed.meanings.slice(0, 5) : [],
    }
  } catch {
    console.warn('Memo: lookupWordViaLLM 返回格式异常，无法解析 JSON', raw.substring(0, 100))
    return { word: fallbackWord, meanings: [] }
  }
}
