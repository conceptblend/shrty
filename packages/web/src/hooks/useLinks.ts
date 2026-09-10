import { useCallback, useEffect, useState } from 'react'
import type { Link, PaginatedLinks } from '@shrty/shared'

interface UseLinksResult {
  links: Link[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  unauthorized: boolean
  hasMore: boolean
  loadMore: () => void
  refetch: () => void
}

const PAGE_SIZE = 20

export function useLinks(apiKey: string): UseLinksResult {
  const [links, setLinks] = useState<Link[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  const fetchPage = useCallback(
    async (cursor: number | null, append: boolean) => {
      if (!apiKey) {
        setLoading(false)
        setLinks([])
        return
      }

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)
      setUnauthorized(false)

      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
        if (cursor !== null) params.set('cursor', String(cursor))

        const res = await fetch(`/api/v1/links?${params}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })

        if (res.status === 401) {
          setUnauthorized(true)
          setLinks([])
          setNextCursor(null)
          return
        }
        if (!res.ok) {
          throw new Error('Failed to fetch links')
        }

        const data: PaginatedLinks = await res.json()
        setLinks((prev) => (append ? [...prev, ...data.links] : data.links))
        setNextCursor(data.nextCursor)
      } catch (err: any) {
        setError(err.message ?? 'Failed to fetch links')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [apiKey],
  )

  useEffect(() => {
    fetchPage(null, false)
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (nextCursor !== null) {
      fetchPage(nextCursor, true)
    }
  }, [nextCursor, fetchPage])

  const refetch = useCallback(() => fetchPage(null, false), [fetchPage])

  return {
    links,
    loading,
    loadingMore,
    error,
    unauthorized,
    hasMore: nextCursor !== null,
    loadMore,
    refetch,
  }
}
