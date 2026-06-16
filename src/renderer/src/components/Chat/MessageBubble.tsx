import { useState } from 'react'
import { Volume2, Check, Copy, NotebookPen } from 'lucide-react'
import WordSpan from './WordSpan'
import WordDetail from '../Common/WordDetail'
import { speakSentence } from '../../services/tts'
import { getLangCode } from '../../services/translate'
import { tokenizeText } from '../../utils/text'
import { useSettingsStore } from '../../store/settingsStore'
import { useFlashcardStore } from '../../store/flashcardStore'
import type { Message } from '../../store/chatStore'

interface MessageBubbleProps {
  message: Message
  isGroup?: boolean
}

export default function MessageBubble({ message, isGroup = false }: MessageBubbleProps) {
  const [wordDetail, setWordDetail] = useState<{ word: string; rect: DOMRect } | null>(null)
  const [copied, setCopied] = useState(false)
  const [cardCreated, setCardCreated] = useState(false)
  const { ttsSpeed, targetLanguage } = useSettingsStore((s) => s.settings)
  const ttsLang = getLangCode(targetLanguage)
  const addCard = useFlashcardStore((s) => s.addCard)

  const isUser = message.role === 'user'

  const handleWordClick = (word: string, rect: DOMRect) => {
    if (word) setWordDetail({ word, rect })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('Memo: MessageBubble 复制到剪贴板失败', e)
    }
  }

  const handleSpeak = () => {
    // 始终朗读外语内容：AI消息就是 main content，用户消息是 translation
    const foreignText = isUser ? (message.translation || message.content) : message.content
    speakSentence(foreignText, ttsLang, ttsSpeed)
  }

  const handleCreateCard = () => {
    // 气泡的正反面语言方向取决于消息来源
    // AI 消息：content=外语, translation=母语 → front=content, back=translation
    // 用户消息：content=母语, translation=外语 → front=translation, back=content
    addCard({
      front: isUser ? (message.translation || message.content) : message.content,
      back: isUser ? message.content : (message.translation || ''),
      sourceLang: settings.targetLanguage,
      targetLang: settings.nativeLanguage,
      context: `来自聊天: ${message.characterName ? message.characterName + ' 说' : 'AI'}`,
    })
    setCardCreated(true)
    setTimeout(() => setCardCreated(false), 2000)
  }

  const renderContent = (text: string) => {
    if (!text) return null
    return tokenizeText(text).map((w, i) => (
      <WordSpan key={`${w}-${i}`} word={w} onClick={handleWordClick} />
    ))
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 message-enter`}>
      <div className="max-w-[75%]">
        {/* Character name (group chat only) */}
        {isGroup && !isUser && message.characterName && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-sm">{message.characterEmoji}</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{message.characterName}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}>
          {/* Correction */}
          {message.correction && (
            <div className="mb-2 pb-2 border-b border-yellow-300/30">
              <div className="flex items-start gap-1.5 text-sm">
                <span className="text-yellow-500 flex-shrink-0">✏️</span>
                <p className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">{message.correction.explanation}</p>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="text-[15px] leading-relaxed break-words">
            {message.isStreaming ? (
              <>
                {message.content}
                <span className="inline-flex ml-0.5"><span className="w-2 h-4 bg-primary-500 dark:bg-primary-400 animate-pulse" /></span>
              </>
            ) : (
              renderContent(message.content)
            )}
          </div>

          {/* 翻译状态指示器 */}
          {isUser && message.translationStatus === 'pending' && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <span className="text-xs text-primary-200 animate-pulse">翻译中...</span>
            </div>
          )}
          {isUser && message.translationStatus === 'failed' && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <span className="text-xs text-yellow-300">⚠️ 翻译失败</span>
            </div>
          )}

          {/* Translation — AI消息显示母语翻译，用户消息显示外语翻译 */}
          {message.translation && (
            <div className={`mt-2 pt-2 border-t ${isUser ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`text-sm leading-relaxed break-words ${isUser ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {renderContent(message.translation)}
              </div>
            </div>
          )}

          {/* Actions */}
          {!message.isStreaming && (
            <div className={`flex items-center gap-1 mt-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <button onClick={handleSpeak}
                className={`p-1 rounded-md transition-colors ${isUser ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400'}`}
              >
                <Volume2 size={14} />
              </button>
              <button onClick={handleCopy}
                className={`p-1 rounded-md transition-colors ${isUser ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400'}`}
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <button onClick={handleCreateCard}
                className={`p-1 rounded-md transition-colors ${isUser ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/10 dark:hover:bg-white/10 text-gray-400'}`}
              >
                {cardCreated ? <Check size={14} className="text-green-500" /> : <NotebookPen size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] text-gray-400 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {wordDetail && <WordDetail word={wordDetail.word} anchorRect={wordDetail.rect} onClose={() => setWordDetail(null)} />}
    </div>
  )
}
