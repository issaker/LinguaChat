import type { Character } from '../../data/presetCharacters'

interface CharacterBadgeProps {
  character: Character
  size?: 'sm' | 'md'
}

export default function CharacterBadge({ character, size = 'md' }: CharacterBadgeProps) {
  const isSm = size === 'sm'
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
        isSm ? 'text-xs' : 'text-sm'
      }`}
    >
      <span className={`${isSm ? 'text-lg' : 'text-xl'}`}>{character.emoji}</span>
      <div className="min-w-0">
        <p className={`font-medium truncate ${isSm ? 'text-xs' : 'text-sm'}`}>
          {character.name}
        </p>
        <p className="text-xs text-gray-400 truncate max-w-[120px]">
          {character.occupation}
        </p>
      </div>
    </div>
  )
}
