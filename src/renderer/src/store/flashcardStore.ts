import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sm2, isDueForReview, daysUntilReview, type SM2Rating } from '../services/sm2'
import { generateId } from '../utils/id'

export interface Flashcard {
  id: string
  front: string         // 外语（正面）
  back: string          // 释义/翻译（背面）
  flipped: boolean      // 是否对调正反面
  context?: string      // 来源上下文（来自哪条聊天）
  sourceLang: string
  targetLang: string
  createdAt: number

  // SM2 调度数据
  ease: number          // ease factor, 默认 2.5
  interval: number      // 间隔天数
  repetitions: number   // 连续正确次数
  nextReview: number    // 下次复习时间戳
  lastReviewed: number | null
}

interface FlashcardStore {
  cards: Flashcard[]
  isReviewing: boolean

  // 卡片 CRUD
  addCard: (card: { front: string; back: string; context?: string; sourceLang?: string; targetLang?: string }) => void
  deleteCard: (id: string) => void
  updateCard: (id: string, updates: Partial<Flashcard>) => void
  toggleFlip: (id: string) => void

  // 复习
  startReview: () => void
  stopReview: () => void
  gradeCard: (id: string, rating: SM2Rating) => void

  // 查询
  getDueCards: () => Flashcard[]
  getCardById: (id: string) => Flashcard | undefined
  getDueCount: () => number
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      cards: [],
      isReviewing: false,

      addCard: (data) =>
        set((state) => ({
          cards: [
            {
              id: generateId('fc-'),
              front: data.front,
              back: data.back,
              flipped: false,
              context: data.context,
              sourceLang: data.sourceLang || 'en',
              targetLang: data.targetLang || 'zh-CN',
              createdAt: Date.now(),
              ease: 2.5,
              interval: 0,
              repetitions: 0,
              nextReview: Date.now(),
              lastReviewed: null,
            },
            ...state.cards,
          ],
        })),

      deleteCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
        })),

      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      toggleFlip: (id) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, flipped: !c.flipped } : c
          ),
        })),

      startReview: () => set({ isReviewing: true }),

      stopReview: () => set({ isReviewing: false }),

      gradeCard: (id, rating) =>
        set((state) => {
          const card = state.cards.find((c) => c.id === id)
          if (!card) return state

          const result = sm2(card.ease, card.interval, card.repetitions, rating)
          return {
            cards: state.cards.map((c) =>
              c.id === id
                ? {
                    ...c,
                    ease: result.ease,
                    interval: result.interval,
                    repetitions: result.repetitions,
                    nextReview: result.nextReview,
                    lastReviewed: Date.now(),
                  }
                : c
            ),
          }
        }),

      getDueCards: () => {
        return get().cards.filter((c) => isDueForReview(c.nextReview))
      },

      getCardById: (id) => get().cards.find((c) => c.id === id),

      getDueCount: () => get().cards.filter((c) => isDueForReview(c.nextReview)).length,
    }),
    {
      name: 'linguachat-flashcards',
      partialize: (state) => ({ cards: state.cards }),
    }
  )
)
