import { Card, CardContent } from '@/components/ui/card'

interface SummaryCardsProps {
  totalClicks: number
  uniqueVisitors: number
  topCountry: string | null
  topReferrer: string | null
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

export function SummaryCards({
  totalClicks,
  uniqueVisitors,
  topCountry,
  topReferrer,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
      <StatCard label="Unique Visitors" value={uniqueVisitors.toLocaleString()} />
      <StatCard label="Top Country" value={topCountry ?? '—'} />
      <StatCard label="Top Referrer" value={topReferrer ?? '—'} />
    </div>
  )
}
