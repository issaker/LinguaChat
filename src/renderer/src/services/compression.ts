/**
 * 上下文压缩服务
 *
 * 当对话超过 token 限制时，将远期消息压缩为摘要，
 * 保留近期完整消息，减少 token 开销和 AI 幻觉。
 */

import type { Message } from '../store/chatStore'
import type { Settings } from '../store/settingsStore'
import type { Character } from '../data/presetCharacters'
import { callLLM } from './llm'

/** 保留的最近消息条数 */
const KEEP_RECENT = 40

/** 粗略估算 token 数（中英文混合 ~3 字符/token） */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3)
}

/** 估算整段对话的 token 数 */
export function estimateConversationTokens(messages: Message[]): number {
  let total = 0
  for (const m of messages) {
    total += estimateTokenCount(m.content)
    if (m.translation) total += estimateTokenCount(m.translation)
    if (m.correction?.explanation) total += estimateTokenCount(m.correction.explanation)
    total += 8
  }
  return total
}

/** 判断是否需要压缩 */
export function needsCompression(messages: Message[], limit = 30000): boolean {
  return estimateConversationTokens(messages) > limit
}

/** 找到第一条非 system 消息的索引（跳过已有的压缩摘要） */
function findFirstRealMessageIndex(messages: Message[]): number {
  return messages.findIndex((m) => m.role !== 'system')
}

/**
 * 用 LLM 将旧消息压缩为摘要
 */
async function summarizeHistory(
  messages: Message[],
  existingSummary: string,
  settings: Settings,
  character: Character,
  nativeLang: string,
  targetLang: string
): Promise<string> {
  // 把待压缩消息拼成文本
  const historyText = messages
    .map((m) => {
      const role = m.role === 'user' ? '用户' : `${m.characterName || character.name}`
      const trans = m.translation ? ` (${m.translation})` : ''
      const correction = m.correction ? ` [纠错: ${m.correction.explanation}]` : ''
      return `${role}: ${m.content}${trans}${correction}`
    })
    .join('\n')

  const systemPrompt = `你是对话摘要助手。请用 ${targetLang} 总结以下对话历史。

要求：
- 保留关键信息：讨论过的话题、用户的外语水平、常犯的错误类型、用户的兴趣爱好
- 保留重要的词汇和表达
- 用简洁的段落形式，不要用列表
- 控制在 500 tokens 以内
${existingSummary ? `\n已有的摘要（请在其基础上补充新内容）:\n${existingSummary}` : ''}`

  try {
    const content = await callLLM(settings, {
      systemPrompt,
      messages: [{ role: 'user', content: historyText }],
      temperature: 0.3,
      maxTokens: 800,
    })
    return content.trim() || '（压缩失败）'
  } catch (err) {
    console.error(`Memo: 上下文压缩 LLM 调用失败 — ${messages.length} 条消息`, err)
    return `[对话历史: ${messages.length} 条消息，讨论了 ${messages.filter((m) => m.role === 'assistant').length} 轮]`
  }
}

/**
 * 对对话执行压缩
 * 返回压缩后的消息列表 + 压缩信息
 */
export async function compressConversation(
  messages: Message[],
  settings: Settings,
  character: Character,
  nativeLang: string,
  targetLang: string
): Promise<{
  compressed: Message[]
  compressedCount: number
  preservedCount: number
  summary: string
}> {
  const firstRealIdx = findFirstRealMessageIndex(messages)
  const existingSummary = firstRealIdx > 0 ? messages[0].content : ''

  // 分离"待压缩部分"和"保留部分"
  const toCompress = messages.slice(firstRealIdx, -KEEP_RECENT)
  const toKeep = messages.slice(-KEEP_RECENT)

  if (toCompress.length === 0) {
    return { compressed: messages, compressedCount: 0, preservedCount: toKeep.length, summary: existingSummary }
  }

  // 调用 LLM 压缩
  const summary = await summarizeHistory(toCompress, existingSummary, settings, character, nativeLang, targetLang)

  // 构建压缩后的消息列表
  const summaryMsg: Message = {
    id: 'ctx-summary',
    role: 'system',
    content: `📋 对话历史摘要（${toCompress.length} 条消息已压缩）:\n${summary}`,
    timestamp: Date.now(),
  }

  return {
    compressed: [summaryMsg, ...toKeep],
    compressedCount: toCompress.length,
    preservedCount: toKeep.length,
    summary,
  }
}
