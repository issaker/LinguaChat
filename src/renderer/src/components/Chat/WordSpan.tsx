import { useState, useCallback } from 'react'
import { CJK_RE } from '../../utils/text'

interface WordSpanProps {
  word: string
  lang?: string
  onClick?: (word: string, rect: DOMRect) => void
}

/** 统一清洗单词文本 */
function cleanWord(word: string): string {
  return CJK_RE.test(word)
    ? word.trim()
    : word.replace(/[^a-zA-ZÀ-ɏ'-]/g, '').toLowerCase()
}

export default function WordSpan({ word, lang = 'en', onClick }: WordSpanProps) {
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      onClick?.(cleanWord(word), rect)
    },
    [word, onClick]
  )

  // Only make real words clickable (skip punctuation, spaces)
  const isClickable = CJK_RE.test(word) || /[a-zA-ZÀ-ɏ]/.test(word)

  if (!isClickable) {
    return <span>{word}</span>
  }

  return (
    <span
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="word-clickable inline-block px-0.5 -mx-0.5 relative"
      title={hovered ? '点击查看释义' : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          onClick?.(cleanWord(word), rect)
        }
      }}
    >
      {word}
    </span>
  )
}
