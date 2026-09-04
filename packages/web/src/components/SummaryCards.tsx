interface SummaryCardsProps {
  totalClicks: number
  uniqueVisitors: number
  topCountry: string | null
  topReferrer: string | null
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

export function SummaryCards({
  totalClicks,
  uniqueVisitors,
  topCountry,
  topReferrer,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
      <StatCard label="Unique Visitors" value={uniqueVisitors.toLocaleString()} />
      <StatCard label="Top Country" value={topCountry ?? '—'} />
      <StatCard label="Top Referrer" value={topReferrer ?? '—'} />
    </div>
  )
}
