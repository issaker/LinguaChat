import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCharacterStore } from '../../store/characterStore'
import type { Character } from '../../data/presetCharacters'

export default function CharacterEditor() {
  const { editingCharacter, closeCharacterEditor, addCharacter, updateCharacter } =
    useCharacterStore()

  const isEditing = !!editingCharacter

  const [form, setForm] = useState<Partial<Character>>({
    id: '',
    name: '',
    emoji: '👤',
    age: undefined,
    occupation: '',
    nativeLanguage: 'English',
    targetLanguage: 'English',
    background: '',
    personality: '',
    speakingStyle: '',
    interests: [],
    sceneTags: [],
    isLearner: false,
    systemPrompt: '',
  })

  const [interestInput, setInterestInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (editingCharacter) {
      setForm({ ...editingCharacter })
    } else {
      setForm({
        id: `char-${Date.now()}`,
        name: '',
        emoji: '👤',
        occupation: '',
        nativeLanguage: 'English',
        targetLanguage: 'English',
        background: '',
        personality: '',
        speakingStyle: '',
        interests: [],
        sceneTags: [],
        isLearner: false,
        systemPrompt: '',
      })
    }
  }, [editingCharacter])

  const handleSave = () => {
    if (!form.name?.trim()) return

    const character = form as Character
    if (isEditing) {
      updateCharacter(character.id, character)
    } else {
      addCharacter({ ...character, id: `char-${Date.now()}` })
    }
    closeCharacterEditor()
  }

  const addInterest = () => {
    const val = interestInput.trim()
    if (val && !form.interests?.includes(val)) {
      setForm({ ...form, interests: [...(form.interests ?? []), val] })
    }
    setInterestInput('')
  }

  const addTag = () => {
    const val = tagInput.trim()
    if (val && !form.sceneTags?.includes(val)) {
      setForm({ ...form, sceneTags: [...(form.sceneTags ?? []), val] })
    }
    setTagInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[560px] max-h-[85vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold">
            {isEditing ? '编辑角色' : '创建新角色'}
          </h2>
          <button
            onClick={closeCharacterEditor}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium mb-1">头像</label>
              <input
                type="text"
                value={form.emoji || '👤'}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium mb-1">名字</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Emma"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">年龄</label>
              <input
                type="number"
                value={form.age ?? ''}
                onChange={(e) => setForm({ ...form, age: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">职业/身份</label>
              <input
                type="text"
                value={form.occupation || ''}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                placeholder="咖啡馆老板 / Barista"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">母语</label>
              <input
                type="text"
                value={form.nativeLanguage}
                onChange={(e) => setForm({ ...form, nativeLanguage: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          {/* Background */}
          <div>
            <label className="block text-xs font-medium mb-1">人物小传</label>
            <textarea
              value={form.background || ''}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              rows={3}
              placeholder="描述这个角色的背景故事、性格特点..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>

          {/* Personality & Style */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">性格</label>
              <input
                type="text"
                value={form.personality || ''}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                placeholder="开朗、热情、有同理心"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">说话风格</label>
              <input
                type="text"
                value={form.speakingStyle || ''}
                onChange={(e) => setForm({ ...form, speakingStyle: e.target.value })}
                placeholder="亲切随和，喜欢用口语词"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-medium mb-1">兴趣爱好</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.interests?.map((i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs"
                >
                  {i}
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        interests: form.interests?.filter((x) => x !== i),
                      })
                    }
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="输入兴趣后按 Enter 添加"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                onClick={addInterest}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* Scene Tags */}
          <div>
            <label className="block text-xs font-medium mb-1">场景标签</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.sceneTags?.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs"
                >
                  {t}
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        sceneTags: form.sceneTags?.filter((x) => x !== t),
                      })
                    }
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="输入场景标签 (如: 咖啡厅、商务)"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                onClick={addTag}
                className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* Learner toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isLearner || false}
              onChange={(e) => setForm({ ...form, isLearner: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-400"
            />
            <span className="text-sm">
              这个角色也在学习外语（会犯小错误，增加真实感）
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={closeCharacterEditor}
            className="px-4 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name?.trim()}
            className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors"
          >
            {isEditing ? '保存修改' : '创建角色'}
          </button>
        </div>
      </div>
    </div>
  )
}
