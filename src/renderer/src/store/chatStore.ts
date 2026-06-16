import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '../utils/id'

export interface WordDetail {
  word: string
  phonetic?: string
  meanings: string[]
  audioUrl?: string
}

export interface Correction {
  original: string
  corrected: string
  explanation: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  characterId?: string      // 哪个角色发的
  characterName?: string
  characterEmoji?: string
  content: string           // 外语版本
  translation?: string      // 母语翻译
  translationStatus?: 'pending' | 'loaded' | 'failed'  // 翻译加载状态（仅用户消息）
  correction?: Correction   // 纠错信息
  timestamp: number
  wordDetails?: WordDetail[]
  isStreaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  characterIds: string[]
  sceneId?: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

interface ChatStore {
  conversations: Conversation[]
  activeConversationId: string | null
  isStreaming: boolean
  streamingContent: string

  // 对话管理
  createConversation: (title: string, characterIds: string[], sceneId?: string) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void

  // 消息操作
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  updateLastMessage: (conversationId: string, updates: Partial<Message>) => void
  replaceMessages: (conversationId: string, messages: Message[]) => void
  clearMessages: (conversationId: string) => void

  // 流式状态
  setStreaming: (streaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void

  // 单词详情
  setWordDetails: (conversationId: string, messageId: string, details: WordDetail[]) => void

  // 获取当前对话
  getActiveConversation: () => Conversation | undefined
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      streamingContent: '',

      createConversation: (title, characterIds, sceneId) => {
        const id = generateId()
        const now = Date.now()
        const conv: Conversation = {
          id,
          title,
          characterIds,
          sceneId,
          messages: [],
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversationId: id,
        }))
        return id
      },

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        })),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      updateLastMessage: (conversationId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const msgs = [...c.messages]
            if (msgs.length === 0) return c
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...updates }
            return { ...c, messages: msgs }
          }),
        })),

      clearMessages: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [] } : c
          ),
        })),

      replaceMessages: (conversationId, messages) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages, updatedAt: Date.now() } : c
          ),
        })),

      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setStreamingContent: (content) => set({ streamingContent: content }),

      appendStreamingContent: (chunk) =>
        set((state) => ({ streamingContent: state.streamingContent + chunk })),

      setWordDetails: (conversationId, messageId, details) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, wordDetails: details } : m
              ),
            }
          }),
        })),

      getActiveConversation: () => {
        const state = get()
        return state.conversations.find((c) => c.id === state.activeConversationId)
      },
    }),
    {
      name: 'linguachat-conversations',
      partialize: (state) => ({
        conversations: state.conversations.map((c) => ({
          ...c,
          messages: c.messages.map((m) => ({
            ...m,
            isStreaming: false, // 持久化时不保存流式状态
          })),
        })),
        activeConversationId: state.activeConversationId,
      }),
    }
  )
)
