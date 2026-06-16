import { useRef, useEffect, useCallback } from 'react'
import { MessageSquare, FileText } from 'lucide-react'
import MessageBubble from './MessageBubble'
import InputArea from './InputArea'
import TypingIndicator from './TypingIndicator'
import { useChatStore, type Message } from '../../store/chatStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useCharacterStore } from '../../store/characterStore'
import { sendMessage, sendGroupMessage, translateViaLLM } from '../../services/llm'
import { needsCompression, compressConversation } from '../../services/compression'
import { generateId } from '../../utils/id'

export default function ChatWindow() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const { settings } = useSettingsStore()
  const { characters, activeCharacterIds } = useCharacterStore()

  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const createConversation = useChatStore((s) => s.createConversation)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateLastMessage = useChatStore((s) => s.updateLastMessage)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const setStreaming = useChatStore((s) => s.setStreaming)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const messages = activeConv?.messages ?? []
  const isGroup = activeCharacterIds.length > 1 || (activeConv?.characterIds?.length ?? 1) > 1
  const activeChars = isGroup
    ? activeCharacterIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean)
    : [characters.find((c) => c.id === activeCharacterIds[0])].filter(Boolean)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Handle send message
  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      // Create conversation if none active
      let convId = activeConversationId
      if (!convId) {
        const charNames = activeCharacterIds
          .map((id) => characters.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(', ')
        convId = createConversation(charNames || 'New Chat', activeCharacterIds)
      }

      // Add user message (with translation to target language)
      const userMsgId = generateId('msg-')
      const userMsg: Message = {
        id: userMsgId,
        role: 'user',
        content: text,
        translationStatus: 'pending',
        timestamp: Date.now(),
      }
      addMessage(convId, userMsg)

      // 异步翻译用户输入 → 目标外语（走用户配置的 API 通道）
      if (settings.apiKey?.trim()) {
        translateViaLLM(text, settings.nativeLanguage, settings.targetLanguage, settings)
          .then((translated) => {
            if (convId) {
              const updates: Partial<Message> = { translationStatus: 'loaded' }
              if (translated && translated !== text) {
                updates.translation = translated
              }
              useChatStore.getState().updateMessage(convId, userMsgId, updates)
            }
          })
          .catch((err) => {
            console.error(
              `Memo: LLM 翻译失败 — native="${settings.nativeLanguage}" target="${settings.targetLanguage}" text="${text.substring(0, 50)}"`,
              err
            )
            if (convId) {
              useChatStore.getState().updateMessage(convId, userMsgId, {
                translationStatus: 'failed',
              })
            }
          })
      }

      // 上下文压缩：检查是否超过 token 限制
      const currentConv = useChatStore.getState().conversations.find((c) => c.id === convId)
      if (currentConv && needsCompression(currentConv.messages, settings.compressionTokenLimit) && settings.apiKey) {
        const char = characters.find((c) => c.id === activeCharacterIds[0])
        const compressingMsg: Message = {
          id: generateId('msg-') + '-compressing',
          role: 'system',
          content: '🔄 正在压缩历史对话...',
          timestamp: Date.now(),
        }
        addMessage(convId, compressingMsg)
        try {
          const result = await compressConversation(
            currentConv.messages,
            settings,
            char || characters[0],
            settings.nativeLanguage,
            settings.targetLanguage
          )
          if (result.compressedCount > 0) {
            // 合并：保留压缩摘要，但用最新的消息替换可能过时的快照消息
            // 这样 translateViaLLM 在 await 期间完成的翻译更新就不会丢失
            const latestConv = useChatStore.getState().conversations.find((c) => c.id === convId)
            if (latestConv) {
              const latestById = new Map(latestConv.messages.map((m) => [m.id, m]))
              const preserved = result.compressed.slice(1).map(
                (snap) => latestById.get(snap.id) || snap
              )
              useChatStore.getState().replaceMessages(convId, [result.compressed[0], ...preserved])
            }
          }
        } catch (err) {
          console.error('Memo: 对话压缩失败，已清除压缩占位消息', err)
          // 从最新消息中移除压缩占位符（不依赖快照）
          const latestConv = useChatStore.getState().conversations.find((c) => c.id === convId)
          if (latestConv) {
            useChatStore.getState().replaceMessages(
              convId,
              latestConv.messages.filter((m) => m.id !== compressingMsg.id)
            )
          }
        }
      }

      if (!settings.apiKey?.trim()) {
        // Demo mode: simulate AI response
        const simMsg: Message = {
          id: generateId('msg-'),
          role: 'assistant',
          characterId: activeCharacterIds[0],
          characterName: characters.find((c) => c.id === activeCharacterIds[0])?.name,
          characterEmoji: characters.find((c) => c.id === activeCharacterIds[0])?.emoji,
          content: `Hello! That's interesting. I'd love to chat more once you configure your API key in Settings.\n\nYou said: "${text}"\n\n---\n你好！这很有趣。等你配置好 API Key 后我们可以好好聊聊。\n\n你说: "${text}"`,
          translation: '你好！等你在设置中配置好 API Key 后我们可以好好聊天。',
          timestamp: Date.now() + 1,
        }
        setTimeout(() => {
          addMessage(convId!, simMsg)
        }, 500)
        return
      }

      // Real API call
      setStreaming(true)

      try {
        if (isGroup && activeChars.length > 1) {
          // Group chat: send to each character sequentially
          for (const char of activeChars) {
            if (!char) continue

            const otherChars = activeChars.filter((c) => c && c.id !== char.id).filter(Boolean)
            const msgId = generateId('msg-') + '-' + char.id
            const charMsg: Message = {
              id: msgId,
              role: 'assistant',
              characterId: char.id,
              characterName: char.name,
              characterEmoji: char.emoji,
              content: '',
              timestamp: Date.now(),
              isStreaming: true,
            }
            addMessage(convId, charMsg)

            let fullContent = ''
            const result = await sendGroupMessage(
              settings,
              char,
              otherChars as typeof characters,
              messages.map((m) => ({
                role: m.role,
                content: m.content,
                characterName: m.characterName,
              })),
              text,
              undefined,
              (chunk) => {
                fullContent += chunk
                updateLastMessage(convId, { content: fullContent })
              }
            )

            updateLastMessage(convId, {
              content: result.content,
              translation: result.translation,
              isStreaming: false,
            })
          }
        } else {
          // 1-on-1 chat
          const char = activeChars[0]
          if (!char) return

          const msgId = generateId('msg-')
          const aiMsg: Message = {
            id: msgId,
            role: 'assistant',
            characterId: char.id,
            characterName: char.name,
            characterEmoji: char.emoji,
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
          }
          addMessage(convId, aiMsg)

          let fullContent = ''
          const result = await sendMessage(
            settings,
            char,
            messages.map((m) => ({
              role: m.role,
              content: m.content,
              characterName: m.characterName,
            })),
            text,
            undefined,
            (chunk) => {
              fullContent += chunk
              updateLastMessage(convId, { content: fullContent })
            }
          )

          updateLastMessage(convId, {
            content: result.content,
            translation: result.translation,
            isStreaming: false,
          })
        }
      } catch (error) {
        console.error('Memo: Failed to get AI response:', error)
        const errorMsg: Message = {
          id: generateId('msg-') + '-error',
          role: 'system',
          content: `⚠️ API 调用失败: ${error instanceof Error ? error.message : '未知错误'}\n请检查 API 设置。`,
          timestamp: Date.now(),
        }
        addMessage(convId, errorMsg)
      } finally {
        setStreaming(false)
      }
    },
    [
      activeConversationId,
      activeCharacterIds,
      characters,
      messages,
      settings,
      isStreaming,
      isGroup,
      activeChars,
      createConversation,
      addMessage,
      updateLastMessage,
      setStreaming,
    ]
  )

  // Empty state
  if (!activeConv && !activeConversationId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-primary-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            LinguaChat · 语伴
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
            和 AI 角色对话，在自然交流中学习外语。
            <br />
            点击左侧「新建对话」开始，或进入 Settings 配置 API。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{activeConv?.title ?? '对话'}</h2>
          <p className="text-xs text-gray-400">
            {isGroup ? `${activeCharacterIds.length} 个角色 · 群聊模式` : '一对一模式'}
            {!settings.apiKey && ' · ⚠️ 未配置 API'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              开始和{activeChars.map((c) => c?.name).join(', ')}聊天吧！
              <br />
              <span className="text-xs">
                {settings.showTranslation
                  ? 'AI 会自动回复外语 + 母语翻译'
                  : 'AI 会自动回复外语'}
              </span>
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isGroup={isGroup}
            />
          ))
        )}

        {/* Typing indicator */}
        {isStreaming && (
          <TypingIndicator
            names={activeChars.map((c) => c?.name ?? '').filter(Boolean)}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <InputArea onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
