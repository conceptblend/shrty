import type { ClickEvent } from '@shrty/shared'

interface RecentClicksProps {
  data: ClickEvent[]
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
          <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs text-gray-400 w-16 shrink-0">
                {new Date(click.clickedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="truncate text-gray-600 dark:text-gray-300">
                {click.referrer ?? 'direct'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs shrink-0">
              <span>{click.browser}/{click.os}</span>
              <span>{click.country ?? 'XX'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
