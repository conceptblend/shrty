const FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', JP: '🇯🇵',
  AU: '🇦🇺', BR: '🇧🇷', IN: '🇮🇳', KR: '🇰🇷', NL: '🇳🇱', SE: '🇸🇪',
  ES: '🇪🇸', IT: '🇮🇹', MX: '🇲🇽', RU: '🇷🇺', CN: '🇨🇳', PL: '🇵🇱',
}

interface CountryTableProps {
  data: { country: string; clicks: number; percentage: number }[]
}

export function CountryTable({ data }: CountryTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Countries</h3>
        <p className="text-sm text-gray-400">No country data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Countries</h3>
      <div className="space-y-2">
        {data.map((c) => (
          <div key={c.country} className="flex items-center justify-between text-sm">
            <span>
              {FLAGS[c.country] ?? '🌍'} {c.country}
            </span>
            <span className="font-mono text-gray-500">
              {c.clicks.toLocaleString()} ({c.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
