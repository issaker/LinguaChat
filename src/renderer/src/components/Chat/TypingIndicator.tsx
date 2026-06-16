interface TypingIndicatorProps {
  names: string[]
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null

  return (
    <div className="flex items-start gap-2 mb-4 message-enter">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
          </div>
          <span className="text-xs text-gray-400">
            {names.join(', ')} 正在输入...
          </span>
        </div>
      </div>
    </div>
  )
}
