import type { ClickEvent } from '@shrty/shared'

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
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Recent Clicks</h3>
        <p className="text-sm text-gray-400">No clicks yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Recent Clicks</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {data.map((click, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="font-mono text-xs text-gray-400 w-14 shrink-0 whitespace-nowrap">
                {formatRelativeTime(click.clickedAt)}
              </span>
              <span className="truncate text-gray-600 dark:text-gray-300">
                {click.referrer ?? 'direct'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs shrink-0 whitespace-nowrap max-w-[45%] sm:max-w-none">
              <span className="truncate">{click.browser ?? 'Unknown'}</span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="truncate">{click.os ?? 'Unknown'}</span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="font-mono uppercase">{click.country ?? 'XX'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
