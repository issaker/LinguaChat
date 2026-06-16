import { describe, it, expect } from 'vitest'
import { sm2, isDueForReview, daysUntilReview, RATING_INFO } from '../../services/sm2'
import type { SM2Result, SM2Rating } from '../../services/sm2'

describe('sm2 核心算法', () => {
  const defaultParams = { ease: 2.5, interval: 0, repetitions: 0 }

  it('评分为 0 (Again) 时重置', () => {
    const r = sm2(defaultParams.ease, defaultParams.interval, defaultParams.repetitions, 0)
    expect(r.ease).toBe(2.3)          // 2.5 - 0.2
    expect(r.interval).toBe(1)        // 重置为 1 天
    expect(r.repetitions).toBe(0)     // 连续正确归零
  })

  it('评分为 1 (Hard) 时降低 ease', () => {
    const r = sm2(2.5, 6, 2, 1)
    expect(r.ease).toBe(2.35)         // 2.5 - 0.15
    expect(r.repetitions).toBe(3)
  })

  it('评分为 2 (Good) 时 ease 不变', () => {
    const r = sm2(2.5, 6, 2, 2)
    expect(r.ease).toBe(2.5)
  })

  it('评分为 3 (Easy) 时增加 ease', () => {
    const r = sm2(2.5, 6, 2, 3)
    expect(r.ease).toBe(2.65)         // 2.5 + 0.15
  })

  it('第一次正确 (repetitions=1) 间隔为 1 天', () => {
    const r = sm2(2.5, 0, 0, 2)
    expect(r.interval).toBe(1)
    expect(r.repetitions).toBe(1)
  })

  it('第二次正确 (repetitions=2) 间隔为 6 天', () => {
    const r = sm2(2.5, 1, 1, 2)
    expect(r.interval).toBe(6)
    expect(r.repetitions).toBe(2)
  })

  it('第三次及以上按 ease × 上次间隔', () => {
    const r = sm2(2.5, 6, 2, 2)
    expect(r.interval).toBe(15)       // Math.round(6 * 2.5)
    expect(r.repetitions).toBe(3)
  })

  it('ease 不低于 MIN_EASE（1.3）', () => {
    // 多次 Again 让 ease 降到最低
    let params = { ease: 1.3, interval: 1, repetitions: 0 }
    for (let i = 0; i < 10; i++) {
      params = sm2(params.ease, params.interval, params.repetitions, 0)
    }
    expect(params.ease).toBeGreaterThanOrEqual(1.3)
  })

  it('间隔不超过 365 天', () => {
    const r = sm2(100, 300, 10, 3)  // 极高 ease
    expect(r.interval).toBeLessThanOrEqual(365)
  })

  it('间隔至少 1 天', () => {
    const r = sm2(1.3, 0, 0, 0)    // Again
    expect(r.interval).toBeGreaterThanOrEqual(1)
  })

  it('返回 nextReview 时间戳', () => {
    const r = sm2(2.5, 0, 0, 2)
    expect(r.nextReview).toBeGreaterThan(0)
    expect(typeof r.nextReview).toBe('number')
  })
})

describe('isDueForReview', () => {
  it('过去的时间戳应该到期', () => {
    expect(isDueForReview(Date.now() - 86400000)).toBe(true)  // 昨天
  })

  it('未来的时间戳不应该到期', () => {
    expect(isDueForReview(Date.now() + 86400000)).toBe(false) // 明天
  })
})

describe('RATING_INFO', () => {
  it('包含 4 个评分等级', () => {
    expect(Object.keys(RATING_INFO)).toHaveLength(4)
  })

  it('每个等级有 label 和 shortcut', () => {
    for (const rating of [0, 1, 2, 3] as SM2Rating[]) {
      expect(RATING_INFO[rating].label).toBeTruthy()
      expect(RATING_INFO[rating].shortcut).toBeTruthy()
    }
  })
})
