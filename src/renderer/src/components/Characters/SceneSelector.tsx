import { X, Users } from 'lucide-react'
import { useState } from 'react'
import { SCENE_PRESETS, type ScenePreset } from '../../data/presetCharacters'
import { useCharacterStore } from '../../store/characterStore'

interface SceneSelectorProps {
  onSelectScene: (sceneId: string) => void
  onClose: () => void
}

export default function SceneSelector({ onSelectScene, onClose }: SceneSelectorProps) {
  const { characters } = useCharacterStore()
  const [selectedScene, setSelectedScene] = useState<ScenePreset | null>(null)

  const getCharacterName = (id: string) => {
    const char = characters.find((c) => c.id === id)
    return char?.emoji ? `${char.emoji} ${char.name}` : id
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-bold">🎭 选择场景</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {SCENE_PRESETS.map((scene) => {
            const selected = selectedScene?.id === scene.id
            return (
              <button
                key={scene.id}
                onClick={() => setSelectedScene(scene)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{scene.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{scene.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {scene.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Users size={12} />
                      <span>
                        {scene.characters.map(getCharacterName).join(' · ')}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {scene.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer — 固定在底部，不随场景列表滚动 */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => selectedScene && onSelectScene(selectedScene.id)}
            disabled={!selectedScene}
            className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            开始场景对话
          </button>
        </div>
      </div>
    </div>
  )
}
