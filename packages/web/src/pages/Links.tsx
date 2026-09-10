import { useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import type { Link } from '@shrty/shared'
import { useApiKey } from '@/hooks/useApiKey'
import { useLinks } from '@/hooks/useLinks'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ApiKeyForm({
  apiKey,
  invalid,
  onSave,
}: {
  apiKey: string
  invalid: boolean
  onSave: (key: string) => void
}) {
  const [value, setValue] = useState(apiKey)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      onSave(trimmed)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Enter API Key</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="api-key" className="text-sm font-medium">
              Shrty API key
            </label>
            <Input
              id="api-key"
              name="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your API key…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'api-key-error' : undefined}
            />
            {invalid && (
              <p id="api-key-error" className="text-sm text-destructive" aria-live="polite">
                That key was rejected — check it and try again.
              </p>
            )}
          </div>
          <Button type="submit" disabled={!value.trim()}>
            Save Key
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CopyShortLinkButton({ shortUrl }: { shortUrl: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={() => copy(shortUrl)}
      className="shrink-0"
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span className="sr-only">{copied ? 'Copied' : 'Copy short link'}</span>
    </Button>
  )
}

function LinkRow({ link }: { link: Link }) {
  const shortUrl = `${window.location.origin}/${link.hash}`
  const isExpired = link.expiresAt !== null && new Date(link.expiresAt) < new Date()

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1">
          <RouterLink
            to={`/a/${link.hash}`}
            className="truncate font-mono text-primary underline-offset-4 hover:underline"
          >
            /{link.hash}
          </RouterLink>
          <CopyShortLinkButton shortUrl={shortUrl} />
        </div>
      </TableCell>
      <TableCell>
        <a
          href={link.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full min-w-0 items-center gap-1 text-foreground hover:text-primary hover:underline"
        >
          <span className="truncate">{link.destinationUrl}</span>
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        </a>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(link.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {link.expiresAt ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {isExpired && <Badge variant="destructive">Expired</Badge>}
            {new Date(link.expiresAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
        {link.clickCount.toLocaleString()}
      </TableCell>
    </TableRow>
  )
}

export default function Links() {
  const { apiKey, setApiKey } = useApiKey()
  const { links, loading, loadingMore, error, unauthorized, hasMore, loadMore, refetch } =
    useLinks(apiKey)

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-balance">All Links</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every short link created on this instance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiKey && !unauthorized && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={refetch}
              aria-label="Refresh links"
            >
              <RefreshCw aria-hidden="true" />
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {!apiKey || unauthorized ? (
        <ApiKeyForm apiKey={apiKey} invalid={unauthorized} onSave={setApiKey} />
      ) : loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load links</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
          <Button type="button" variant="outline" size="sm" onClick={refetch} className="mt-2">
            Retry
          </Button>
        </Alert>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No links yet — create one via the API to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Short Link</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="w-28">Created</TableHead>
                  <TableHead className="w-36">Expires</TableHead>
                  <TableHead className="w-20 text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <LinkRow key={link.id} link={link} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {hasMore && (
            <CardFooter className="justify-center">
              <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  )
}
