/**
 * 语言代码映射（供 TTS 和设置面板使用）
 */

/** 语言代码 → 显示名 */
export const LANGUAGES: Record<string, string> = {
  'en': 'English 英语',
  'ja': '日本語 日语',
  'ko': '한국어 韩语',
  'de': 'Deutsch 德语',
  'fr': 'Français 法语',
  'es': 'Español 西班牙语',
  'it': 'Italiano 意大利语',
  'pt': 'Português 葡萄牙语',
  'ru': 'Русский 俄语',
  'ar': 'العربية 阿拉伯语',
  'th': 'ไทย 泰语',
  'vi': 'Tiếng Việt 越南语',
  'zh-CN': '中文 简体中文',
  'zh-TW': '中文 繁体中文',
}

/** 根据语言名获取代码（兼容用户自由输入） */
export function getLangCode(name: string): string {
  const entry = Object.entries(LANGUAGES).find(([, label]) =>
    label.startsWith(name) || label.includes(name)
  )
  return entry?.[0] || 'en'
}
