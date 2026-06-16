import { describe, it, expect } from 'vitest'
import { parseCorrection } from '../../services/llm'

describe('parseCorrection', () => {
  it('检测 ✏️ 开头的纠错', () => {
    const result = parseCorrection('✏️ should be "went"\nI went to school.')
    expect(result).not.toBeNull()
    expect(result!.explanation).toBe('should be "went"')
    expect(result!.remaining).toBe('I went to school.')
  })

  it('没有纠错时返回 null', () => {
    const result = parseCorrection('I went to school.')
    expect(result).toBeNull()
  })

  it('纠错位于整段文字开头', () => {
    const result = parseCorrection('✏️ use "much" instead of "many"\nI have much money.')
    expect(result).not.toBeNull()
    expect(result!.explanation).toBe('use "much" instead of "many"')
  })

  it('一个文本中只提取第一个纠错', () => {
    const result = parseCorrection('✏️ first error\nSome text\n✏️ second error')
    expect(result).not.toBeNull()
    expect(result!.explanation).toBe('first error')
  })
})
