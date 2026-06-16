/**
 * SM2 间隔重复算法
 *
 * 基于 SuperMemo SM-2 算法简化实现，
 * 用于闪卡的间隔重复复习调度。
 *
 * 评分等级:
 *   0 - Again  (完全忘记 / 错误)
 *   1 - Hard   (想起但很困难)
 *   2 - Good   (正常回忆，有些犹豫)
 *   3 - Easy   (轻松正确回忆)
 */

export type SM2Rating = 0 | 1 | 2 | 3

export interface SM2Result {
  ease: number
  interval: number     // 下次复习间隔（天）
  repetitions: number  // 连续正确次数
  nextReview: number   // 下次复习时间戳 (ms)
}

const MIN_EASE = 1.3
const MAX_INTERVAL = 365 // 最多一年后

/**
 * SM2 核心算法
 *
 * @param ease         当前 ease 因子 (默认 2.5)
 * @param interval     当前间隔天数 (默认 0)
 * @param repetitions  当前连续正确次数 (默认 0)
 * @param rating       本次评分 0-3
 * @returns            新的 SM2 参数
 */
export function sm2(
  ease: number,
  interval: number,
  repetitions: number,
  rating: SM2Rating
): SM2Result {
  let newEase = ease
  let newInterval: number
  let newRepetitions: number

  if (rating === 0) {
    // Again: 完全忘记，重置
    newEase = Math.max(MIN_EASE, ease - 0.2)
    newInterval = 1
    newRepetitions = 0
  } else {
    // 根据评分调整 ease 因子
    const easeDelta: Record<number, number> = {
      1: -0.15, // Hard
      2: 0,     // Good
      3: 0.15,  // Easy
    }
    newEase = Math.max(MIN_EASE, ease + (easeDelta[rating] || 0))
    newRepetitions = repetitions + 1

    // 计算新间隔
    if (newRepetitions === 1) {
      newInterval = 1
    } else if (newRepetitions === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * newEase)
    }
  }

  // 限制最大间隔
  newInterval = Math.min(newInterval, MAX_INTERVAL)
  // 最小间隔 1 天
  newInterval = Math.max(newInterval, 1)

  // 计算下次复习时间（今天 + 间隔天数，重置到北京时间 4:00 方便复习）
  const now = new Date()
  const nextReview = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0)
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    ease: newEase,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: nextReview.getTime(),
  }
}

/**
 * 获取今天到期的卡片数量（用于徽章显示）
 */
export function isDueForReview(nextReview: number): boolean {
  return nextReview <= Date.now()
}

/**
 * 获取距今天数（用于显示复习状态）
 */
export function daysUntilReview(nextReview: number): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const reviewDay = new Date(nextReview)
  const reviewDate = new Date(reviewDay.getFullYear(), reviewDay.getMonth(), reviewDay.getDate())
  return Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 86400))
}

/**
 * 评分对应的文本标签和颜色
 */
export const RATING_INFO: Record<SM2Rating, { label: string; color: string; shortcut: string }> = {
  0: { label: '再次', color: 'bg-red-500 hover:bg-red-600', shortcut: '1' },
  1: { label: '困难', color: 'bg-orange-500 hover:bg-orange-600', shortcut: '2' },
  2: { label: '良好', color: 'bg-green-500 hover:bg-green-600', shortcut: '3' },
  3: { label: '简单', color: 'bg-blue-500 hover:bg-blue-600', shortcut: '4' },
}
