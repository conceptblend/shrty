import { useState, useEffect, useRef } from 'react'

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 30000,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    async function poll() {
      try {
        const result = await fetcher()
        if (activeRef.current) {
          setData(result)
          setLoading(false)
          setError(null)
        }
      } catch (err: any) {
        if (activeRef.current) {
          setError(err.message ?? 'Failed to fetch')
          setLoading(false)
        }
      }
    }

    poll()
    const id = setInterval(poll, intervalMs)

    return () => {
      activeRef.current = false
      clearInterval(id)
    }
  }, [intervalMs])

  return { data, loading, error }
}
