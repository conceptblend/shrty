import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { SummaryCards } from '../components/SummaryCards'
import { ClickChart } from '../components/ClickChart'
import { ReferrerTable } from '../components/ReferrerTable'
import { DeviceChart } from '../components/DeviceChart'
import { BrowserChart } from '../components/BrowserChart'
import { CountryTable } from '../components/CountryTable'
import { RecentClicks } from '../components/RecentClicks'
import { ThemeToggle } from '../components/ThemeToggle'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { ShortLinkDisplay } from '../components/ShortLinkDisplay'

function formatUpdatedAgo(lastUpdated: Date, now: Date): string {
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / 1000))
  if (diffSeconds < 5) return 'just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  return `${diffHours}h ago`
}

function FreshnessControl({
  lastUpdated,
  isRefreshing,
  onRefresh,
}: {
  lastUpdated: Date | null
  isRefreshing: boolean
  onRefresh: () => void
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
      <span>{lastUpdated ? `Updated ${formatUpdatedAgo(lastUpdated, now)}` : ''}</span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh analytics"
        title="Refresh"
        className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        <span aria-hidden="true" className={isRefreshing ? 'inline-block animate-spin' : 'inline-block'}>
          ⟳
        </span>
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { hash } = useParams<{ hash: string }>()
  const { data, loading, error, lastUpdated, isRefreshing, refetch } = useAnalytics(hash!)

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error loading analytics</h1>
          <p className="text-gray-500 mb-4">{error ?? 'Unknown error'}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const hasClicks = data.totalClicks > 0

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shrty — Link Analytics</h1>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium">Hash:</span>{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{hash}</code>
            </p>
            <p>
              <span className="font-medium">Created:</span>{' '}
              {new Date(data.createdAt).toLocaleDateString()}
            </p>
            <p className="truncate">
              <span className="font-medium">Destination:</span>{' '}
              <a href={data.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
                {data.destinationUrl}
              </a>
            </p>
            <ShortLinkDisplay hash={hash!} />
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Freshness */}
      <FreshnessControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} />

      {!hasClicks ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No clicks yet — share your link to start seeing analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <SummaryCards
            totalClicks={data.totalClicks}
            uniqueVisitors={data.uniqueVisitors}
            topCountry={data.countries[0]?.country ?? null}
            topReferrer={data.topReferrers[0]?.referrer ?? null}
          />

          {/* Click chart */}
          <div className="mt-6">
            <ClickChart data={data.clicksByDay} />
          </div>

          {/* Referrers + Devices */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReferrerTable data={data.topReferrers} />
            <DeviceChart data={data.devices} />
          </div>

          {/* Browsers + Countries */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <BrowserChart data={data.browsers} />
            <CountryTable data={data.countries} />
          </div>

          {/* Recent clicks */}
          <div className="mt-6">
            <RecentClicks data={data.recentClicks} />
          </div>
        </>
      )}
    </div>
  )
}
