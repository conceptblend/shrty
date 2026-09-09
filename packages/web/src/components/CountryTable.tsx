import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const FLAGS: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  CA: '🇨🇦',
  JP: '🇯🇵',
  AU: '🇦🇺',
  BR: '🇧🇷',
  IN: '🇮🇳',
  KR: '🇰🇷',
  NL: '🇳🇱',
  SE: '🇸🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  MX: '🇲🇽',
  RU: '🇷🇺',
  CN: '🇨🇳',
  PL: '🇵🇱',
}

interface CountryTableProps {
  data: { country: string; clicks: number; percentage: number }[]
}

export function CountryTable({ data }: CountryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Countries</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No country data yet</p>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Country</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.country}>
                  <TableCell className="truncate">
                    <span aria-hidden="true">{FLAGS[c.country] ?? '🌍'}</span> {c.country}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {c.clicks.toLocaleString()} ({c.percentage}%)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
