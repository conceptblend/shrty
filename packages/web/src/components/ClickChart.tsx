import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface ClickChartProps {
  data: { date: string; clicks: number }[]
}

export function ClickChart({ data }: ClickChartProps) {
  const sorted = [...data].reverse()
  const reduceMotion = usePrefersReducedMotion()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Clicks Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={sorted}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleDateString()}
              contentStyle={{
                background: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={!reduceMotion}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
