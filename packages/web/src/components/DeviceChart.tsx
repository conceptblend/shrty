import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface DeviceChartProps {
  data: { type: string; clicks: number }[]
}

const CHART_VARS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DeviceChart({ data }: DeviceChartProps) {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Devices</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No device data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="clicks"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                isAnimationActive={!reduceMotion}
                label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.type} fill={CHART_VARS[i % CHART_VARS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  color: 'var(--popover-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
