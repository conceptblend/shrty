import type { AnalyticsSummary } from '@shrty/shared'
import { usePolling } from './usePolling'

export function useAnalytics(hash: string, pollInterval = 30000) {
  return usePolling<AnalyticsSummary>(async () => {
    const res = await fetch(`/api/v1/analytics/${hash}`)
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  }, pollInterval)
}
