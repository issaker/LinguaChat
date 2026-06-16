import { describe, it, expect } from 'vitest'
import { estimateTokenCount, estimateConversationTokens, needsCompression } from '../../services/compression'
import type { Message } from '../../store/chatStore'

describe('estimateTokenCount', () => {
  it('英文按 ~3 字符/token 估算', () => {
    const result = estimateTokenCount('hello world')  // 11 chars
    expect(result).toBe(4)  // Math.ceil(11/3)
  })

  it('空字符串返回 0', () => {
    expect(estimateTokenCount('')).toBe(0)
  })

  it('中文同样按 ~3 字符/token', () => {
    expect(estimateTokenCount('你好世界')).toBe(2) // 4/3 → 2
  })

  it('混合文本', () => {
    const result = estimateTokenCount('Hello 你好')
    expect(result).toBe(3) // 8/3 → 3
  })
})

describe('estimateConversationTokens', () => {
  function makeMsg(overrides: Partial<Message>): Message {
    return {
      id: 'test',
      role: 'user',
      content: '',
      timestamp: Date.now(),
      ...overrides,
    }
  }

  it('空消息列表返回 0', () => {
    expect(estimateConversationTokens([])).toBe(0)
  })

  it('计算 content + translation + correction', () => {
    const msgs = [
      makeMsg({ content: 'hello', translation: '你好' }),
    ]
    // content: 5/3=2, translation: 2/3=1, overhead: 8 = 11 total
    expect(estimateConversationTokens(msgs)).toBe(11)
  })
})

describe('needsCompression', () => {
  it('超过限制时需要压缩', () => {
    // 制造一个较大的消息
    const bigContent = 'a'.repeat(90000)
    expect(needsCompression([{
      id: '1',
      role: 'user',
      content: bigContent,
      timestamp: Date.now(),
    }], 30000)).toBe(true)
  })

  it('未超过限制时不需要压缩', () => {
    expect(needsCompression([{
      id: '1',
      role: 'user',
      content: 'short',
      timestamp: Date.now(),
    }], 30000)).toBe(false)
  })
})
