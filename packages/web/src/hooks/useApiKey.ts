import { useCallback, useState } from 'react'

const STORAGE_KEY = 'shrty-api-key'

function readStoredApiKey(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function useApiKey(): { apiKey: string; setApiKey: (key: string) => void } {
  const [apiKey, setApiKeyState] = useState<string>(readStoredApiKey)

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    try {
      if (key) {
        window.localStorage.setItem(STORAGE_KEY, key)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore persistence failures (e.g. private browsing storage limits).
    }
  }, [])

  return { apiKey, setApiKey }
}
