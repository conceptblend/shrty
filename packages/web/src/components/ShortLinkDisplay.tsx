import { useState } from 'react'

interface ShortLinkDisplayProps {
  hash: string
}

const COPIED_FEEDBACK_MS = 1500

export function ShortLinkDisplay({ hash }: ShortLinkDisplayProps) {
  const [copied, setCopied] = useState(false)
  const shortUrl = `${window.location.origin}/${hash}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      // Clipboard access can fail (e.g. insecure context/permissions); ignore silently.
    }
  }

  return (
    <p className="flex items-center gap-2">
      <span className="font-medium">Short link:</span>{' '}
      <a
        href={shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-500 hover:underline truncate"
      >
        {shortUrl}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </p>
  )
}
