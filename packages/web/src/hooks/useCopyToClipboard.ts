import { useCallback, useState } from 'react'

const COPIED_FEEDBACK_MS = 1500

export function useCopyToClipboard(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)

  const copy = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
      })
      .catch(() => {
        // Clipboard access can fail (e.g. insecure context/permissions); ignore silently.
      })
  }, [])

  return { copied, copy }
}
