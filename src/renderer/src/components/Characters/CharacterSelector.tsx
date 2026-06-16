import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useCharacterStore } from '../../store/characterStore'
import CharacterBadge from './CharacterBadge'

export default function CharacterSelector() {
  const {
    characters,
    activeCharacterIds,
    setActiveCharacters,
    addActiveCharacter,
    removeActiveCharacter,
    openCharacterEditor,
    removeCharacter,
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
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          点击选择参与对话的角色（{activeCharacterIds.length} 个已选）
        </p>
        <button
          onClick={() => openCharacterEditor()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          新建角色
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {characters.map((char) => (
          <div key={char.id} className="relative group">
            <button
              onClick={() => toggleCharacter(char.id)}
              className={`transition-all ${
                isActive(char.id)
                  ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-gray-50 dark:ring-offset-gray-800 rounded-xl'
                  : 'opacity-50 hover:opacity-70'
              }`}
            >
              <CharacterBadge character={char} />
            </button>
            <div className="absolute top-0 right-0 hidden group-hover:flex gap-0.5 -mt-1.5 -mr-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openCharacterEditor(char)
                }}
                className="p-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <Pencil size={10} className="text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeCharacter(char.id)
                }}
                className="p-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 size={10} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {characters.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          还没有角色，点击「新建角色」创建一个
        </p>
      )}
    </div>
  )
}
