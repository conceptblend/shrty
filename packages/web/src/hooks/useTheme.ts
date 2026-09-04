import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'shrty-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'light'
  } catch {
    return 'light'
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore persistence failures (e.g. private browsing storage limits).
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
