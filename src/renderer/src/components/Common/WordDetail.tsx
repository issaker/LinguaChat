import { useEffect, useState, useRef } from 'react'
import { Volume2, X, Loader2 } from 'lucide-react'
import { lookupWordViaLLM } from '../../services/lookup'
import { dictionary } from '../../services/dictionary'
import { getLangCode } from '../../services/translate'
import { speakWord } from '../../services/tts'
import { useSettingsStore } from '../../store/settingsStore'

interface WordDetailProps {
  word: string
  anchorRect: DOMRect
  onClose: () => void
}

interface WordData {
  word: string
  phonetic?: string
  meanings: string[]
  loading: boolean
  error: boolean
  source: 'dictionary' | 'ai' | null
}

export default function WordDetail({ word, anchorRect, onClose }: WordDetailProps) {
  const [data, setData] = useState<WordData>({
    word,
    meanings: [],
    loading: true,
    error: false,
    source: null,
  })
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const settings = useSettingsStore((s) => s.settings)
  const ttsSpeed = settings.ttsSpeed
  const ttsLang = getLangCode(settings.targetLanguage)

  // Fetch word data: 本地词典 → LLM 兜底
  useEffect(() => {
    let mounted = true
    setData({ word, meanings: [], loading: true, error: false })

    async function lookup() {
      // 先试本地词典（零 token，毫秒级）
      const localEntry = await dictionary.lookup(word)
      if (!mounted) return

      if (localEntry && localEntry.definitions.length > 0) {
        setData({
          word,
          phonetic: localEntry.pinyin,
          meanings: localEntry.definitions,
          loading: false,
          error: false,
          source: 'dictionary',
        })
        return
      }

      // 本地词典未收录 → 用 LLM 兜底
      try {
        const result = await lookupWordViaLLM(
          word,
          settings.nativeLanguage,
          settings.targetLanguage,
          settings
        )
        if (mounted) {
          setData({
            word: result.word,
            phonetic: result.phonetic,
            meanings: result.meanings,
            loading: false,
            error: false,
            source: 'ai',
          })
        }
      } catch (err) {
        console.error(`Memo: 单词查询失败 — word="${word}"`, err)
        if (mounted) {
          setData((prev) => ({ ...prev, loading: false, error: true }))
        }
      }
    }

    lookup()

    return () => {
      mounted = false
    }
  }, [word])

  // Position the popup
  useEffect(() => {
    const calculatePosition = () => {
      const spacing = 8
      let top = anchorRect.bottom + spacing
      let left = anchorRect.left

      // Ensure it doesn't go off-screen
      const panelWidth = 280
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left + panelWidth > viewportWidth - 16) {
        left = viewportWidth - panelWidth - 16
      }
      if (left < 16) left = 16

      // If below viewport, show above
      if (top + 250 > viewportHeight) {
        top = anchorRect.top - 250 - spacing
      }

      setPosition({ top, left })
    }

    calculatePosition()
    window.addEventListener('scroll', calculatePosition, true)
    return () => window.removeEventListener('scroll', calculatePosition, true)
  }, [anchorRect])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to prevent immediate close from the click that triggered it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSpeak = () => {
    speakWord(data.word, ttsLang, ttsSpeed)
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-72 animate-bounce-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold">{data.word}</h3>
            {data.phonetic && (
              <p className="text-xs text-gray-400 mt-0.5">{data.phonetic}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {data.loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : data.error ? (
            <p className="text-sm text-red-500 dark:text-red-400 py-2">
              ⚠️ 本地词典未收录，AI 查词失败
            </p>
          ) : data.meanings.length > 0 ? (
            <ul className="space-y-1.5">
              {data.meanings.map((m, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5 flex-shrink-0">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 py-2">未找到释义</p>
          )}

          {/* 来源标识 */}
          {!data.loading && data.source && (
            <div className="mt-2 flex justify-end">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                data.source === 'dictionary'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'
                  : 'bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400'
              }`}>
                {data.source === 'dictionary' ? '📖 词典' : '🤖 AI'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button
            onClick={handleSpeak}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-300 transition-colors"
          >
            <Volume2 size={15} />
            朗读
          </button>
        </div>
      </div>
    </div>
  )
}
