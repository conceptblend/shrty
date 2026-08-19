import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SlidingWindowRateLimiter } from '../lib/rate-limit'

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter(3, 1000) // 3 requests per second
  })

  it('allows requests under the limit', () => {
    expect(limiter.isAllowed('key1').allowed).toBe(true)
    expect(limiter.isAllowed('key1').allowed).toBe(true)
    expect(limiter.isAllowed('key1').allowed).toBe(true)
  })

  it('rejects requests over the limit', () => {
    limiter.isAllowed('key1')
    limiter.isAllowed('key1')
    limiter.isAllowed('key1')

    const result = limiter.isAllowed('key1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks different keys independently', () => {
    limiter.isAllowed('key1')
    limiter.isAllowed('key1')
    limiter.isAllowed('key1')

    expect(limiter.isAllowed('key1').allowed).toBe(false)
    expect(limiter.isAllowed('key2').allowed).toBe(true)
  })

  it('returns remaining count', () => {
    const r1 = limiter.isAllowed('key1')
    expect(r1.remaining).toBe(2)

    const r2 = limiter.isAllowed('key1')
    expect(r2.remaining).toBe(1)
  })
})
