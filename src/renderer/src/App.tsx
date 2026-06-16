import { useState, useEffect } from 'react'
import { Settings, PanelLeftOpen, PanelLeftClose, Sun, Moon, Monitor } from 'lucide-react'
import ChatWindow from './components/Chat/ChatWindow'
import Sidebar from './components/Sidebar/Sidebar'
import SettingsPanel from './components/Settings/SettingsPanel'
import ReviewView from './components/Memo/ReviewView'
import SceneSelector from './components/Characters/SceneSelector'
import CharacterEditor from './components/Characters/CharacterEditor'
import CharacterManageModal from './components/Characters/CharacterManageModal'
import { SCENE_PRESETS } from './data/presetCharacters'
import { useCharacterStore } from './store/characterStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { useTheme, getNextTheme } from './hooks/useTheme'

type View = 'chat' | 'settings' | 'memo'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [view, setView] = useState<View>('chat')
  const [showCharacterManager, setShowCharacterManager] = useState(false)

  const { showCharacterEditor, showSceneSelector, closeCharacterEditor, closeSceneSelector } = useCharacterStore()
  const { activeConversationId, createConversation } = useChatStore()
  const { activeCharacterIds, activeSceneId, characters, applyScene } = useCharacterStore()
  const { settings, updateSettings } = useSettingsStore()

  // 应用主题
  useTheme()

  // Create default conversation if none exists
  useEffect(() => {
    if (!activeConversationId && characters.length > 0) {
      const charNames = activeCharacterIds
        .map((id) => characters.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      createConversation(charNames || 'New Chat', activeCharacterIds, activeSceneId ?? undefined)
    }
  }, [])

  const handleNewChat = () => {
    const charNames = activeCharacterIds
      .map((id) => characters.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')
    createConversation(charNames || 'New Chat', activeCharacterIds, activeSceneId ?? undefined)
  }

  const handleSelectScene = (sceneId: string) => {
    const scenePreset = SCENE_PRESETS.find((s) => s.id === sceneId)
    if (scenePreset) {
      applyScene(scenePreset)
      const charNames = scenePreset.characters
        .map((id) => characters.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      createConversation(`${scenePreset.emoji} ${scenePreset.title}`, scenePreset.characters, sceneId)
    }
    closeSceneSelector()
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 ease-in-out overflow-hidden border-r border-gray-200 dark:border-gray-700 flex-shrink-0`}
      >
        <Sidebar
          onNewChat={() => { setView('chat'); handleNewChat() }}
          onSelectScene={() => useCharacterStore.getState().openSceneSelector()}
          onManageCharacters={() => setShowCharacterManager(true)}
          onOpenMemo={() => setView('memo')}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title Bar */}
        <div className="titlebar-padding flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="titlebar-button p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <h1 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {view === 'memo' ? '📝 单词本' : view === 'settings' ? '⚙️ 设置' : '💬 聊天'}
            </h1>
          </div>
          <div className="flex items-center gap-0.5">
            {/* 主题切换 */}
            <button
              onClick={() => updateSettings({ theme: getNextTheme(settings.theme) })}
              className="titlebar-button p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={`主题: ${settings.theme === 'light' ? '浅色' : settings.theme === 'dark' ? '深色' : '跟随系统'} (点击切换)`}
            >
              {settings.theme === 'light' ? (
                <Sun size={18} />
              ) : settings.theme === 'dark' ? (
                <Moon size={18} />
              ) : (
                <Monitor size={18} />
              )}
            </button>
            {/* 设置 */}
            <button
              onClick={() => setView(view === 'chat' ? 'settings' : 'chat')}
              className={`titlebar-button p-2 rounded-lg transition-colors ${
                view === 'settings'
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === 'settings' ? (
            <SettingsPanel onClose={() => setView('chat')} />
          ) : view === 'memo' ? (
            <ReviewView onBack={() => setView('chat')} />
          ) : (
            <ChatWindow />
          )}
        </div>
      </div>

      {/* Modals */}
      {showCharacterManager && (
        <CharacterManageModal onClose={() => setShowCharacterManager(false)} />
      )}
      {showCharacterEditor && <CharacterEditor />}
      {showSceneSelector && (
        <SceneSelector
          onSelectScene={handleSelectScene}
          onClose={closeSceneSelector}
        />
      )}
    </div>
  )
}
