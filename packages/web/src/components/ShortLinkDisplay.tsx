import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

interface ShortLinkDisplayProps {
  hash: string
}

export function ShortLinkDisplay({ hash }: ShortLinkDisplayProps) {
  const { copied, copy } = useCopyToClipboard()
  const shortUrl = `${window.location.origin}/${hash}`

  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="font-medium text-foreground">Short link:</span>
      <a
        href={shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 truncate text-primary underline-offset-4 hover:underline"
      >
        {shortUrl}
      </a>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => copy(shortUrl)}
        className="shrink-0"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Copied!' : 'Copy'}</span>
      </Button>
    </p>
  )
}
