import type { Theme } from '@/types'

const THEME_KEY = 'docscanner_theme'

export function loadTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) ?? 'light'
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme)
  document.documentElement.setAttribute('data-bs-theme', theme)
}
