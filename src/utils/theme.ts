import type { Theme } from '@/types'
import { readSingleFromStore, writeSingleToStore } from '@/utils/indexedDb'

const THEME_STORE = 'theme'
const LEGACY_THEME_KEY = 'docscanner_theme'

export async function loadTheme(): Promise<Theme> {
  const stored = await readSingleFromStore<{ theme: Theme }>(THEME_STORE, 'theme')
  if (stored?.theme) {
    return stored.theme
  }

  if (typeof window === 'undefined') {
    return 'light'
  }

  const legacyTheme = window.localStorage.getItem(LEGACY_THEME_KEY) as Theme | null
  if (legacyTheme === 'light' || legacyTheme === 'dark') {
    await saveTheme(legacyTheme)
    window.localStorage.removeItem(LEGACY_THEME_KEY)
    return legacyTheme
  }

  return 'light'
}

export async function saveTheme(theme: Theme): Promise<void> {
  await writeSingleToStore(THEME_STORE, 'theme', { theme })
  document.documentElement.setAttribute('data-bs-theme', theme)
}
