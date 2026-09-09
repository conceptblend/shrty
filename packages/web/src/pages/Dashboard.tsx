import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { SummaryCards } from '@/components/SummaryCards'
import { ClickChart } from '@/components/ClickChart'
import { ReferrerTable } from '@/components/ReferrerTable'
import { DeviceChart } from '@/components/DeviceChart'
import { BrowserChart } from '@/components/BrowserChart'
import { CountryTable } from '@/components/CountryTable'
import { RecentClicks } from '@/components/RecentClicks'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { ShortLinkDisplay } from '@/components/ShortLinkDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
      <span>{lastUpdated ? `Updated ${formatUpdatedAgo(lastUpdated, now)}` : ''}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh analytics"
      >
        <RefreshCw aria-hidden="true" className={isRefreshing ? 'animate-spin' : undefined} />
      </Button>
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
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Error loading analytics</h1>
          <p className="mt-2 mb-4 text-muted-foreground">{error ?? 'Unknown error'}</p>
          <Button type="button" variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const hasClicks = data.totalClicks > 0

  return (
    <div className="mx-auto min-h-screen max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-balance">Shrty — Link Analytics</h1>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Hash:</span>{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{hash}</code>
            </p>
            <p>
              <span className="font-medium text-foreground">Created:</span>{' '}
              {new Date(data.createdAt).toLocaleDateString()}
            </p>
            <p className="flex min-w-0 truncate">
              <span className="mr-1 shrink-0 font-medium text-foreground">Destination:</span>
              <a
                href={data.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-primary underline-offset-4 hover:underline"
              >
                {data.destinationUrl}
              </a>
            </p>
            <ShortLinkDisplay hash={hash!} />
          </div>
        </div>
        <ThemeToggle />
      </div>

      <FreshnessControl lastUpdated={lastUpdated} isRefreshing={isRefreshing} onRefresh={refetch} />

      {!hasClicks ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No clicks yet — share your link to start seeing analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryCards
            totalClicks={data.totalClicks}
            uniqueVisitors={data.uniqueVisitors}
            topCountry={data.countries[0]?.country ?? null}
            topReferrer={data.topReferrers[0]?.referrer ?? null}
          />

          <div className="mt-6">
            <ClickChart data={data.clicksByDay} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ReferrerTable data={data.topReferrers} />
            <DeviceChart data={data.devices} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <BrowserChart data={data.browsers} />
            <CountryTable data={data.countries} />
          </div>

          <div className="mt-6">
            <RecentClicks data={data.recentClicks} />
          </div>
        </>
      )}
    </div>
  )
}
