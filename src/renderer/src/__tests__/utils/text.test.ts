import { describe, it, expect } from 'vitest'
import { isCJK, tokenizeText } from '../../utils/text'

describe('isCJK', () => {
  it('中文返回 true', () => {
    expect(isCJK('你好')).toBe(true)
    expect(isCJK('中文')).toBe(true)
  })

  it('日文返回 true', () => {
    expect(isCJK('こんにちは')).toBe(true)
  })

  it('韩文返回 true', () => {
    expect(isCJK('안녕하세요')).toBe(true)
  })

  it('英文返回 false', () => {
    expect(isCJK('hello')).toBe(false)
    expect(isCJK('world')).toBe(false)
  })

  it('数字和标点返回 false', () => {
    expect(isCJK('123')).toBe(false)
    expect(isCJK('.,!?')).toBe(false)
  })

  it('空字符串返回 false', () => {
    expect(isCJK('')).toBe(false)
  })
})

describe('tokenizeText', () => {
  it('空字符串返回空数组', () => {
    expect(tokenizeText('')).toEqual([])
  })

  it('纯英文按空格拆分为单词', () => {
    expect(tokenizeText('hello world')).toEqual(['hello', ' ', 'world'])
  })

  it('纯中文逐字拆分', () => {
    expect(tokenizeText('你好')).toEqual(['你', '好'])
  })

  it('中日英混合正确处理', () => {
    const result = tokenizeText('hello 你好 world')
    expect(result).toContain('hello')
    expect(result).toContain(' ')
    expect(result).toContain('你')
    expect(result).toContain('好')
    expect(result).toContain('world')
  })

  it('连续空格保留', () => {
    expect(tokenizeText('a  b')).toEqual(['a', '  ', 'b'])
  })

  it('英文带标点作为完整词', () => {
    const result = tokenizeText('hello, world!')
    expect(result).toContain('hello,')
    expect(result).toContain(' ')
    expect(result).toContain('world!')
  })

  it('纯日文假名逐字符拆分', () => {
    expect(tokenizeText('こんにちは')).toEqual(['こ', 'ん', 'に', 'ち', 'は'])
  })
})
