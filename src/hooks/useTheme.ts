import { useState, useEffect } from 'react'
import type { Theme } from '@/types'
import { loadTheme, saveTheme } from '@/utils/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    let active = true

    void loadTheme().then((loadedTheme) => {
      if (active) {
        setTheme(loadedTheme)
        void saveTheme(loadedTheme)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void saveTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return { theme, toggleTheme }
}
