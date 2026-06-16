import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ApiProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'gemini'
export type LanguageLevel = 'beginner' | 'intermediate' | 'advanced'
export type ChatMode = '1on1' | 'group'
export type ThemeMode = 'system' | 'light' | 'dark'

export interface Settings {
  apiProvider: ApiProvider
  apiKey: string
  apiBaseUrl: string
  model: string
  nativeLanguage: string
  targetLanguage: string
  level: LanguageLevel
  showTranslation: boolean
  enableCorrection: boolean
  chatMode: ChatMode
  ttsSpeed: number
  autoTts: boolean
  theme: ThemeMode
  reviewReinsertOffset: number
  compressionTokenLimit: number
  aiDictLimit: number
}

interface SettingsStore {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: Settings = {
  apiProvider: 'gemini',
  apiKey: '',
  apiBaseUrl: '',
  model: 'gemini-2.5-flash-lite',
  nativeLanguage: '中文',
  targetLanguage: 'English',
  level: 'beginner',
  showTranslation: true,
  enableCorrection: true,
  chatMode: '1on1',
  ttsSpeed: 1,
  autoTts: false,
  theme: 'system',
  reviewReinsertOffset: 3,
  compressionTokenLimit: 30000,
  aiDictLimit: 2000,
}

const PROVIDER_DEFAULTS: Record<ApiProvider, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
  gemini: { baseUrl: '', model: 'gemini-2.5-flash-lite' },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => {
          const newSettings = { ...state.settings, ...partial }
          // If provider changed, update defaults
          if (partial.apiProvider && partial.apiProvider !== state.settings.apiProvider) {
            const defaults = PROVIDER_DEFAULTS[partial.apiProvider]
            newSettings.apiBaseUrl = defaults.baseUrl
            newSettings.model = defaults.model
          }
          return { settings: newSettings }
        }),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'linguachat-settings',
      // 合入新字段默认值，兼容旧版持久化数据
      merge: (persisted, current) => ({
        ...current,
        settings: { ...current.settings, ...(persisted as SettingsStore)?.settings },
      }),
    }
  )
)
