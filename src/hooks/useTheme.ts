import { useState, useEffect } from 'react'
import type { Theme } from '@/types'
import { loadTheme, saveTheme } from '@/utils/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    saveTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return { theme, toggleTheme }
}
