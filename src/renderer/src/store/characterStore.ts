import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRESET_CHARACTERS, type Character, SCENE_PRESETS, type ScenePreset } from '../data/presetCharacters'

interface CharacterStore {
  characters: Character[]
  activeCharacterIds: string[]        // 当前对话中的角色 IDs（群聊多个，1对1一个）
  activeSceneId: string | null        // 当前场景 ID
  editingCharacter: Character | null  // 正在编辑的角色
  showCharacterEditor: boolean
  showSceneSelector: boolean

  // 角色操作
  addCharacter: (char: Character) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  removeCharacter: (id: string) => void
  resetToPresets: () => void

  // 对话角色管理
  setActiveCharacters: (ids: string[]) => void
  addActiveCharacter: (id: string) => void
  removeActiveCharacter: (id: string) => void

  // 场景
  setActiveScene: (sceneId: string | null) => void
  applyScene: (scene: ScenePreset) => void

  // 编辑界面
  openCharacterEditor: (char?: Character) => void
  closeCharacterEditor: () => void
  openSceneSelector: () => void
  closeSceneSelector: () => void
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      characters: PRESET_CHARACTERS,
      activeCharacterIds: PRESET_CHARACTERS.length > 0 ? [PRESET_CHARACTERS[0].id] : [],
      activeSceneId: null,
      editingCharacter: null,
      showCharacterEditor: false,
      showSceneSelector: false,

      addCharacter: (char) =>
        set((state) => ({ characters: [...state.characters, char] })),

      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          activeCharacterIds: state.activeCharacterIds.filter((cid) => cid !== id),
        })),

      resetToPresets: () =>
        set({
          characters: PRESET_CHARACTERS,
          activeCharacterIds: [PRESET_CHARACTERS[0].id],
        }),

      setActiveCharacters: (ids) => set({ activeCharacterIds: ids }),

      addActiveCharacter: (id) =>
        set((state) => ({
          activeCharacterIds: state.activeCharacterIds.includes(id)
            ? state.activeCharacterIds
            : [...state.activeCharacterIds, id],
        })),

      removeActiveCharacter: (id) =>
        set((state) => ({
          activeCharacterIds: state.activeCharacterIds.filter((cid) => cid !== id),
        })),

      setActiveScene: (sceneId) => set({ activeSceneId: sceneId }),

      applyScene: (scene) =>
        set({
          activeCharacterIds: scene.characters,
          activeSceneId: scene.id,
        }),

      openCharacterEditor: (char) =>
        set({
          editingCharacter: char ?? null,
          showCharacterEditor: true,
        }),

      closeCharacterEditor: () =>
        set({ showCharacterEditor: false, editingCharacter: null }),

      openSceneSelector: () => set({ showSceneSelector: true }),
      closeSceneSelector: () => set({ showSceneSelector: false }),
    }),
    {
      name: 'linguachat-characters',
      partialize: (state) => ({
        characters: state.characters,
        activeCharacterIds: state.activeCharacterIds,
        activeSceneId: state.activeSceneId,
      }),
    }
  )
)
