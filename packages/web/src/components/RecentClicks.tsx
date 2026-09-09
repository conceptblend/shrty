import type { ClickEvent } from '@shrty/shared'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface RecentClicksProps {
  data: ClickEvent[]
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Formats a click timestamp as a short relative time ("just now", "5m ago",
 * "2h ago"). Falls back to a short absolute date/time for anything 24h or
 * older, since "37h ago" stops being useful at a glance.
 */
export function formatRelativeTime(clickedAt: string, now: Date = new Date()): string {
  const clicked = new Date(clickedAt)
  const diffMs = now.getTime() - clicked.getTime()

  if (diffMs < 0 || Number.isNaN(diffMs)) {
    return clicked.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  const diffSeconds = Math.floor(diffMs / 1000)
  if (diffSeconds < 60) {
    return 'just now'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffMs < ONE_DAY_MS) {
    return `${diffHours}h ago`
  }

  return clicked.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function RecentClicks({ data }: RecentClicksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent Clicks</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clicks yet</p>
        ) : (
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">When</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="w-40 text-right">Browser / OS / Country</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((click, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatRelativeTime(click.clickedAt)}
                    </TableCell>
                    <TableCell className="truncate text-foreground">
                      {click.referrer ?? 'direct'}
                    </TableCell>
                    <TableCell className="truncate text-right text-xs text-muted-foreground">
                      {click.browser ?? 'Unknown'} · {click.os ?? 'Unknown'} ·{' '}
                      <span className="font-mono uppercase">{click.country ?? 'XX'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
