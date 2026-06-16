import { X, Plus, Pencil, UserCog } from 'lucide-react'
import { useCharacterStore } from '../../store/characterStore'
import CharacterBadge from './CharacterBadge'

interface CharacterManageModalProps {
  onClose: () => void
}

export default function CharacterManageModal({ onClose }: CharacterManageModalProps) {
  const {
    characters,
    activeCharacterIds,
    addActiveCharacter,
    removeActiveCharacter,
    openCharacterEditor,
    removeCharacter,
    resetToPresets,
  } = useCharacterStore()

  const isActive = (id: string) => activeCharacterIds.includes(id)

  const toggleCharacter = (id: string) => {
    if (isActive(id)) {
      if (activeCharacterIds.length > 1) {
        removeActiveCharacter(id)
      }
    } else {
      addActiveCharacter(id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <UserCog size={20} /> 角色管理
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              选择参与对话的角色，点击卡片切换选中
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Active characters */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                当前对话角色
              </p>
              <span className="text-xs text-primary-500 font-medium">
                {activeCharacterIds.length} / {characters.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeCharacterIds.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">请选择至少一个角色</p>
              ) : (
                characters
                  .filter((c) => activeCharacterIds.includes(c.id))
                  .map((c) => (
                    <CharacterBadge key={c.id} character={c} size="sm" />
                  ))
              )}
            </div>
          </div>

          {/* All characters grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {characters.map((char) => (
              <div
                key={char.id}
                className={`relative rounded-xl border-2 transition-all cursor-pointer ${
                  isActive(char.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 opacity-55 hover:opacity-80'
                }`}
                onClick={() => toggleCharacter(char.id)}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{char.emoji}</span>
                    {isActive(char.id) && (
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-300" />
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-2">{char.name}</p>
                  <p className="text-xs text-gray-400 truncate">{char.occupation}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {char.sceneTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-1 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Edit button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openCharacterEditor(char)
                  }}
                  className="absolute top-1 right-1 p-1.5 rounded-lg bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 opacity-0 hover:opacity-100 transition-opacity shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                  title="编辑角色"
                >
                  <Pencil size={12} className="text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => openCharacterEditor()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              新建角色
            </button>
            <button
              onClick={resetToPresets}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-400 transition-colors"
            >
              恢复默认
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 text-white dark:text-gray-800 text-sm font-medium transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
