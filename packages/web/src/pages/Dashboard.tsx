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

export default function Dashboard() {
  const { hash } = useParams<{ hash: string }>()
  const { data, loading, error } = useAnalytics(hash!)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error loading analytics</h1>
          <p className="text-gray-500">{error ?? 'Unknown error'}</p>
        </div>
      </div>
    )
  }

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
          </div>
        </div>
        <ThemeToggle />
      </div>

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
    </div>
  )
}
