interface ReferrerTableProps {
  data: { referrer: string; clicks: number }[]
}

export function ReferrerTable({ data }: ReferrerTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Top Referrers</h3>
        <p className="text-sm text-gray-400">No referrer data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Top Referrers</h3>
      <div className="space-y-2">
        {data.map((r) => (
          <div key={r.referrer} className="flex items-center justify-between text-sm">
            <span className="truncate mr-2">{r.referrer}</span>
            <span className="font-mono text-gray-500">{r.clicks.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
