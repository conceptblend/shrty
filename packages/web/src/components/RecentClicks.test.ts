import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './RecentClicks'

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-04T12:00:00.000Z')

  it('returns "just now" for sub-minute durations, including 0s', () => {
    expect(formatRelativeTime(now.toISOString(), now)).toBe('just now')
    expect(formatRelativeTime(new Date(now.getTime() - 30_000).toISOString(), now)).toBe('just now')
  })

  it('formats exactly 1 minute and other minute counts', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 60_000).toISOString(), now)).toBe('1m ago')
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now)).toBe('5m ago')
    expect(formatRelativeTime(new Date(now.getTime() - 59 * 60_000).toISOString(), now)).toBe('59m ago')
  })

  it('formats exactly 1 hour and other hour counts under 24h', () => {
    expect(formatRelativeTime(new Date(now.getTime() - 60 * 60_000).toISOString(), now)).toBe('1h ago')
    expect(formatRelativeTime(new Date(now.getTime() - 2 * 60 * 60_000).toISOString(), now)).toBe('2h ago')
    expect(formatRelativeTime(new Date(now.getTime() - 23 * 60 * 60_000).toISOString(), now)).toBe('23h ago')
  })

  it('falls back to a short absolute date for entries 24h or older', () => {
    const dayOld = new Date(now.getTime() - 25 * 60 * 60_000)
    const result = formatRelativeTime(dayOld.toISOString(), now)
    expect(result).not.toContain('ago')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles a future/invalid-looking timestamp without throwing', () => {
    const future = new Date(now.getTime() + 60_000)
    expect(() => formatRelativeTime(future.toISOString(), now)).not.toThrow()
  })
})
