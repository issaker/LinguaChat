import { useState, useEffect, useCallback, useRef } from 'react'
import { Volume2, Plus, Trash2, ArrowLeft, RotateCcw } from 'lucide-react'
import WordSpan from '../Chat/WordSpan'
import WordDetail from '../Common/WordDetail'
import { speakSentence, speakWord } from '../../services/tts'
import { getLangCode } from '../../services/translate'
import { useSettingsStore } from '../../store/settingsStore'
import { useFlashcardStore, type Flashcard } from '../../store/flashcardStore'
import { RATING_INFO, type SM2Rating } from '../../services/sm2'

interface ReviewViewProps {
  onBack: () => void
}

export default function ReviewView({ onBack }: ReviewViewProps) {
  const { cards, addCard, deleteCard, gradeCard, toggleFlip } = useFlashcardStore()
  const { settings } = useSettingsStore()
  const ttsSpeed = settings.ttsSpeed
  const reinsertOffset = settings.reviewReinsertOffset

  const [wordDetail, setWordDetail] = useState<{ word: string; rect: DOMRect } | null>(null)
  const [showNewCardForm, setShowNewCardForm] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')

  // 复习队列：基于本地状态管理，不依赖 store 的实时数据
  const [reviewMode, setReviewMode] = useState(false)
  const [queue, setQueue] = useState<Flashcard[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  const currentCard = queue[queueIndex]
  const isDone = reviewMode && queueIndex >= queue.length
  const dueCards = cards.filter((c) => c.nextReview <= Date.now())

  // Reset showAnswer when moving to next card
  useEffect(() => {
    setShowAnswer(false)
  }, [queueIndex])

  const handleGrade = useCallback(
    (rating: SM2Rating) => {
      if (!currentCard) return
      gradeCard(currentCard.id, rating)

      setQueue((q) => {
        if (rating <= 1) {
          // 忘记/困难 → 插到后面，稍后再来
          const reinsertAt = Math.min(q.length, q.indexOf(currentCard) + reinsertOffset + 1)
          const newQ = q.filter((c) => c.id !== currentCard.id)
          newQ.splice(reinsertAt, 0, currentCard)
          return newQ
        }
        // 良好/简单 → 从队列移除
        return q.filter((c) => c.id !== currentCard.id)
      })
      // 不翻页：queue 变化后 queueIndex 不变，自然显示下一个
    },
    [currentCard, gradeCard]
  )

  const handleAddCard = () => {
    if (!newFront.trim() || !newBack.trim()) return
    addCard({ front: newFront.trim(), back: newBack.trim() })
    setNewFront('')
    setNewBack('')
    setShowNewCardForm(false)
  }

  const handleSpeakFront = () => {
    const text = currentCard?.flipped ? currentCard.back : currentCard?.front || ''
    const lang = getLangCode(currentCard?.flipped ? settings.nativeLanguage : settings.targetLanguage)
    speakSentence(text, lang, ttsSpeed)
  }

  const handleSpeakWord = (word: string, rect: DOMRect) => {
    setWordDetail({ word, rect })
  }

  // 如果不在复习模式，显示卡片列表
  if (!reviewMode) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold">📝 单词本</h2>
            </div>
            <button
              onClick={() => setShowNewCardForm(!showNewCardForm)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              新建卡片
            </button>
          </div>

          {/* New card form */}
          {showNewCardForm && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="外语（正面）..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <input
                type="text"
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="释义/翻译（背面）..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowNewCardForm(false); setNewFront(''); setNewBack('') }} className="px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">取消</button>
                <button onClick={handleAddCard} disabled={!newFront.trim() || !newBack.trim()} className="px-4 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white text-sm font-medium transition-colors">添加</button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary-500">{cards.length}</p>
              <p className="text-xs text-gray-400 mt-1">总卡片</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{dueCards.length}</p>
              <p className="text-xs text-gray-400 mt-1">待复习</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{cards.filter((c) => c.interval > 0).length}</p>
              <p className="text-xs text-gray-400 mt-1">已掌握</p>
            </div>
          </div>

          {/* Start review button */}
          {dueCards.length > 0 && (
            <button
              onClick={() => {
                setQueue(dueCards)
                setQueueIndex(0)
                setReviewMode(true)
              }}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              开始复习（{dueCards.length} 张卡片到期）
            </button>
          )}

          {/* Card list */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400">所有卡片</p>
            {cards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400 font-mono w-10">{card.front.split(' ').length > 3 ? '📝' : '🔤'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.front}</p>
                  <p className="text-xs text-gray-400 truncate">{card.back}</p>
                </div>
                {card.flipped && <span className="text-[10px] text-amber-500 font-medium">已翻转</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  card.nextReview <= Date.now() ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                }`}>
                  {card.nextReview <= Date.now() ? '待复习' : `${Math.ceil((card.nextReview - Date.now()) / 86400000)}天`}
                </span>
                <button
                  onClick={() => toggleFlip(card.id)}
                  className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-500 transition-colors"
                  title={card.flipped ? '还原正反面' : '对调正反面'}
                >
                  🔄
                </button>
                <button onClick={() => deleteCard(card.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {cards.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">还没有卡片，点击「新建卡片」开始</p>
            )}
          </div>
        </div>

        {wordDetail && <WordDetail word={wordDetail.word} anchorRect={wordDetail.rect} onClose={() => setWordDetail(null)} />}
      </div>
    )
  }

  // ===== 复习已完成 =====
  if (isDone) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold mb-2">太棒了！所有卡片已复习完毕</h2>
          <p className="text-sm text-gray-400 mb-6">下次再来巩固吧</p>
          <button onClick={() => setReviewMode(false)} className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
            返回卡片列表
          </button>
        </div>
      </div>
    )
  }

  // ===== 复习中 =====
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button onClick={() => setReviewMode(false)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> 退出复习
        </button>
        <span className="text-xs text-gray-400">
          剩余 {queue.length - queueIndex} 张
        </span>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Front — 如果 flipped，显示原是 back 的内容 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 min-h-[200px] flex flex-col items-center justify-center relative">
            <button
              onClick={() => toggleFlip(currentCard.id)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-amber-500 transition-colors"
              title="对调正反面"
            >
              🔄
            </button>
            <div className="text-2xl font-semibold text-center leading-relaxed break-words">
              {(currentCard.flipped ? currentCard.back : currentCard.front).split(/(\s+)/).map((w, i) => (
                <WordSpan key={i} word={w} onClick={handleSpeakWord} />
              ))}
            </div>
            <button
              onClick={handleSpeakFront}
              className="mt-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500 transition-colors"
              title="朗读"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Show answer button / Back */}
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full mt-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              显示答案
            </button>
          ) : (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6 mt-4 min-h-[100px] flex flex-col items-center justify-center">
                <p className="text-lg text-center leading-relaxed break-words">
                  {currentCard.flipped ? currentCard.front : currentCard.back}
                </p>
                {currentCard.context && (
                  <p className="text-xs text-gray-400 mt-3 italic">来源: {currentCard.context}</p>
                )}
                <button
                  onClick={() => speakSentence(
                    currentCard.flipped ? currentCard.front : currentCard.back,
                    getLangCode(currentCard.flipped ? settings.targetLanguage : settings.nativeLanguage),
                    ttsSpeed
                  )}
                  className="mt-3 p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/30 text-gray-400 hover:text-green-600 transition-colors"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {/* Rating buttons */}
              <div className="flex gap-2 mt-4">
                {(Object.entries(RATING_INFO) as [string, typeof RATING_INFO[SM2Rating]][]).map(([key, info]) => {
                  const rating = Number(key) as SM2Rating
                  return (
                    <button
                      key={key}
                      onClick={() => handleGrade(rating)}
                      className={`flex-1 py-3 rounded-xl text-white text-sm font-medium transition-all active:scale-95 ${info.color}`}
                    >
                      {info.label}
                      <span className="block text-[10px] opacity-70 mt-0.5">快捷键 {info.shortcut}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {wordDetail && <WordDetail word={wordDetail.word} anchorRect={wordDetail.rect} onClose={() => setWordDetail(null)} />}
    </div>
  )
}
