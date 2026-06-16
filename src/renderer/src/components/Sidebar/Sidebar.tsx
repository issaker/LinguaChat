import { Plus, MessageSquare, Trash2, Users, Sparkles, UserCog, Notebook } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useCharacterStore } from '../../store/characterStore'
import type { Conversation } from '../../store/chatStore'

interface SidebarProps {
  onNewChat: () => void
  onSelectScene: () => void
  onManageCharacters: () => void
  onOpenMemo: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Sidebar({ onNewChat, onSelectScene, onManageCharacters, onOpenMemo }: SidebarProps) {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const { characters, activeCharacterIds } = useCharacterStore()

  const getCharacterName = (id: string) => characters.find((c) => c.id === id)?.name ?? id
  const activeChars = activeCharacterIds.map(getCharacterName).join(', ')

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="titlebar-padding px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
          语伴
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {activeChars || '选择角色开始对话'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="p-3 space-y-1.5 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          新建对话
        </button>
        <button
          onClick={onManageCharacters}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
        >
          <UserCog size={16} />
          角色管理
        </button>
        <button
          onClick={onOpenMemo}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
        >
          <Notebook size={16} />
          单词本
        </button>
        <button
          onClick={onSelectScene}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
        >
          <Sparkles size={16} />
          场景预设
        </button>
      </div>

      {/* Character indicator */}
      <div className="px-4 py-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
        <Users size={14} />
        <span className="truncate">
          {activeCharacterIds.length > 1
            ? `${activeCharacterIds.length} 个角色在线`
            : activeChars}
        </span>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500">
            暂无对话
          </div>
        ) : (
          conversations.map((conv: Conversation) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                conv.id === activeConversationId
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <MessageSquare size={16} className="flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{conv.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {conv.messages.length} 条消息 · {formatTime(conv.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConversation(conv.id)
                }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
