import { useEffect } from 'react'
import { useSettingsStore, type ThemeMode } from '../store/settingsStore'

/**
 * 根据主题设置切换 <html> 的 dark class
 * 支持 system / light / dark 三种模式
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme)

  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      const isDark =
        mode === 'dark' ||
        (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

      document.documentElement.classList.toggle('dark', isDark)
    }

    // 先应用一次
    applyTheme(theme)

    // 如果是 system 模式，监听系统主题变化
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])
}

/**
 * 循环切换主题: system → light → dark → system → ...
 */
export function getNextTheme(current: ThemeMode): ThemeMode {
  const order: ThemeMode[] = ['system', 'light', 'dark']
  const idx = order.indexOf(current)
  return order[(idx + 1) % order.length]
}

/**
 * 获取主题对应的图标名称和标签
 */
export function getThemeInfo(theme: ThemeMode): { icon: string; label: string } {
  switch (theme) {
    case 'light':
      return { icon: '☀️', label: '浅色' }
    case 'dark':
      return { icon: '🌙', label: '深色' }
    case 'system':
      return { icon: '💻', label: '跟随系统' }
  }
}
