import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { lookupWordViaLLM, getAiDictionarySize } from '../../services/lookup'
import type { Settings } from '../../store/settingsStore'

// mock callLLM 避免真实 API 调用
vi.mock('../../services/llm', () => ({ callLLM: vi.fn() }))

import { callLLM } from '../../services/llm'

/** 不同测试用不同单词避免 lookupCache 缓存冲突 */
describe('lookupWordViaLLM', () => {
  const mockSettings: Settings = {
    apiProvider: 'openai',
    apiKey: 'test-key',
    apiBaseUrl: '',
    model: 'gpt-4o',
    nativeLanguage: '中文',
    targetLanguage: 'English',
    level: 'beginner',
    showTranslation: true,
    enableCorrection: false,
    chatMode: '1on1',
    ttsSpeed: 1,
    autoTts: false,
    theme: 'system',
    reviewReinsertOffset: 3,
    compressionTokenLimit: 30000,
    aiDictLimit: 2000,
  }

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('空单词直接返回空释义', async () => {
    const result = await lookupWordViaLLM('', '中文', 'English', mockSettings)
    expect(result.word).toBe('')
    expect(result.meanings).toEqual([])
  })

  it('无 API Key 时抛出错误', async () => {
    const noKey = { ...mockSettings, apiKey: '' }
    await expect(
      lookupWordViaLLM('empty-key', '中文', 'English', noKey)
    ).rejects.toThrow('API Key 未配置')
  })

  it('LLM 返回合法 JSON 时正确解析', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({ word: 'json-word', phonetic: '/test/', meanings: ['含义1', '含义2'] })
    )
    const result = await lookupWordViaLLM('json-word', '中文', 'English', mockSettings)
    expect(result.word).toBe('json-word')
    expect(result.phonetic).toBe('/test/')
    expect(result.meanings).toEqual(['含义1', '含义2'])
  })

  it('LLM 返回 markdown 代码块时也能解析', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      '```json\n{"word": "md-word", "phonetic": "/ˈmɑːkdaʊn/", "meanings": ["标记"]}\n```'
    )
    const result = await lookupWordViaLLM('md-word', '中文', 'English', mockSettings)
    expect(result.word).toBe('md-word')
    expect(result.meanings).toEqual(['标记'])
  })

  it('LLM 返回非法格式时返回空释义', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce('这不是JSON格式')
    const result = await lookupWordViaLLM('bad-response', '中文', 'English', mockSettings)
    expect(result.word).toBe('bad-response')
    expect(result.meanings).toEqual([])
  })

  it('缓存命中时不重复调用 LLM', async () => {
    vi.mocked(callLLM).mockResolvedValueOnce(
      JSON.stringify({ word: 'cache-me', meanings: ['缓存测试'] })
    )
    // 第一次调用
    await lookupWordViaLLM('cache-me', '中文', 'English', mockSettings)
    // 第二次 — 应该命中内存缓存
    await lookupWordViaLLM('cache-me', '中文', 'English', mockSettings)

    expect(callLLM).toHaveBeenCalledTimes(1)
  })
})

describe('getAiDictionarySize', () => {
  beforeEach(() => localStorage.clear())

  it('无数据时返回 0', () => {
    expect(getAiDictionarySize()).toBe(0)
  })

  it('存储后返回正确数量', () => {
    localStorage.setItem(
      'linguachat-ai-dictionary',
      JSON.stringify([['k:v:zh', { word: 'test', meanings: ['测试'] }]])
    )
    expect(getAiDictionarySize()).toBe(1)
  })

  it('损坏数据时返回 0', () => {
    localStorage.setItem('linguachat-ai-dictionary', '{{{bad json')
    expect(getAiDictionarySize()).toBe(0)
  })
})
