import { describe, it, expect } from 'vitest'
import { generateId } from '../../utils/id'

describe('generateId', () => {
  it('生成以指定前缀开头的 ID', () => {
    const id = generateId('msg-')
    expect(id.startsWith('msg-')).toBe(true)
  })

  it('无前缀时默认空', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('连续生成不重复', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test-')))
    expect(ids.size).toBe(100)
  })

  it('前缀为 fc- 的卡片 ID', () => {
    const id = generateId('fc-')
    expect(id.startsWith('fc-')).toBe(true)
    expect(id.length).toBeGreaterThan(10)
  })
})
