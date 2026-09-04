import { useState, useEffect, useRef, useCallback } from 'react'

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 30000,
): {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  isRefreshing: boolean
  refetch: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const activeRef = useRef(true)
  const hasLoadedRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const poll = useCallback(async () => {
    if (hasLoadedRef.current) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await fetcherRef.current()
      if (!activeRef.current) return
      setData(result)
      setError(null)
      setLastUpdated(new Date())
      hasLoadedRef.current = true
    } catch (err: any) {
      if (!activeRef.current) return
      setError(err.message ?? 'Failed to fetch')
    } finally {
      if (activeRef.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    activeRef.current = true

    poll()
    const id = setInterval(poll, intervalMs)

    return () => {
      activeRef.current = false
      clearInterval(id)
    }
  }, [intervalMs, poll])

  return { data, loading, error, lastUpdated, isRefreshing, refetch: poll }
}
