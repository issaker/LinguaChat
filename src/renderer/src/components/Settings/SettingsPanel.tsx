import { X } from 'lucide-react'
import { useSettingsStore, type ApiProvider, type LanguageLevel } from '../../store/settingsStore'
import { LANGUAGES, getLangCode } from '../../services/translate'
import { getAiDictionarySize } from '../../services/lookup'

interface SettingsPanelProps {
  onClose: () => void
}

const PROVIDERS: { value: ApiProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini (免费)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama (本地)' },
]

const LEVELS: { value: LanguageLevel; label: string }[] = [
  { value: 'beginner', label: '初级 — 简单词汇和短句' },
  { value: 'intermediate', label: '中级 — 日常对话' },
  { value: 'advanced', label: '高级 — 接近母语者' },
]

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettingsStore()

  // AI 词典词条数（每次打开设置时读取）
  const aiDictSize = getAiDictionarySize()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">设置</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* API Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            📡 API 设置
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">提供商</label>
              <select
                value={settings.apiProvider}
                onChange={(e) => updateSettings({ apiProvider: e.target.value as ApiProvider })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder={
                  settings.apiProvider === 'ollama'
                    ? '本地模型不需要 Key'
                    : settings.apiProvider === 'gemini'
                      ? '输入 Google AI Studio 的 API Key'
                      : 'sk-...'
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {settings.apiProvider === 'gemini' && (
                <a
                  href="https://ai.google.dev/gemini-api/docs/quickstart?hl=zh-cn&authuser=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary-500 hover:text-primary-600 underline underline-offset-2"
                >
                  📖 点此注册并获取 Gemini API Key（官方文档）
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">模型</label>
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={settings.apiBaseUrl}
                  onChange={(e) => updateSettings({ apiBaseUrl: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>

            {/* AI 词典配置 */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">AI 词典</label>
                <span className="text-xs text-gray-400">
                  {aiDictSize} / {settings.aiDictLimit ?? 2000} 词条
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={settings.aiDictLimit ?? 2000}
                onChange={(e) => updateSettings({ aiDictLimit: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>100</span>
                <span>10000</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                查到的新词自动存入本地 AI 词典，下次点击直接返回，不消耗 API。
              </p>
            </div>
          </div>
        </section>

        {/* Language Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            🌐 语言设置
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">母语</label>
                <select
                  value={getLangCode(settings.nativeLanguage)}
                  onChange={(e) => updateSettings({ nativeLanguage: LANGUAGES[e.target.value] || e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {Object.entries(LANGUAGES).filter(([code]) => code !== 'zh-TW').map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">目标外语</label>
                <select
                  value={getLangCode(settings.targetLanguage)}
                  onChange={(e) => updateSettings({ targetLanguage: LANGUAGES[e.target.value] || e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {Object.entries(LANGUAGES).filter(([code]) => code !== 'zh-CN' && code !== 'zh-TW').map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">你的外语水平</label>
              <select
                value={settings.level}
                onChange={(e) => updateSettings({ level: e.target.value as LanguageLevel })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ⚙️ 对话设置
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">显示母语翻译</span>
              <input
                type="checkbox"
                checked={settings.showTranslation}
                onChange={(e) => updateSettings({ showTranslation: e.target.checked })}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-400"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">开启纠错模式</span>
              <input
                type="checkbox"
                checked={settings.enableCorrection}
                onChange={(e) => updateSettings({ enableCorrection: e.target.checked })}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-400"
              />
            </label>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium mb-1.5">
                复习时忘记的卡片隔几张再出现: {settings.reviewReinsertOffset} 张
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.reviewReinsertOffset}
                onChange={(e) => updateSettings({ reviewReinsertOffset: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>马上</span>
                <span>隔 10 张</span>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium mb-1.5">
                上下文压缩阈值: {Math.round(settings.compressionTokenLimit / 1000)}k
              </label>
              <input
                type="range"
                min="5000"
                max="100000"
                step="5000"
                value={settings.compressionTokenLimit}
                onChange={(e) => updateSettings({ compressionTokenLimit: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>5k</span>
                <span>100k</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                对话超过此 token 数时自动压缩远期消息，保留最近 40 条完整。
              </p>
            </div>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            🔉 语音设置
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                朗读速度: {settings.ttsSpeed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.ttsSpeed}
                onChange={(e) => updateSettings({ ttsSpeed: parseFloat(e.target.value) })}
                className="w-full accent-primary-500"
              />
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">自动朗读 AI 回复</span>
              <input
                type="checkbox"
                checked={settings.autoTts}
                onChange={(e) => updateSettings({ autoTts: e.target.checked })}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-400"
              />
            </label>
          </div>
        </section>

        {/* Save hint */}
        <p className="text-xs text-gray-400 text-center pb-8">
          所有设置自动保存 ✓
        </p>
      </div>
    </div>
  )
}
