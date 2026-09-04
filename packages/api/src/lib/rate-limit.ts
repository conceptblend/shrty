export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {
    // Evict stale entries every 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000)
  }

  isAllowed(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now()
    const timestamps = this.windows.get(key) ?? []
    const valid = timestamps.filter((t) => now - t < this.windowMs)

    if (valid.length < this.maxRequests) {
      valid.push(now)
      this.windows.set(key, valid)
      return {
        allowed: true,
        remaining: this.maxRequests - valid.length,
        resetMs: this.windowMs,
      }
    }

    this.windows.set(key, valid)
    const oldest = valid[0] ?? now
    return {
      allowed: false,
      remaining: 0,
      resetMs: this.windowMs - (now - oldest),
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, timestamps] of this.windows) {
      const valid = timestamps.filter((t) => now - t < this.windowMs)
      if (valid.length === 0) {
        this.windows.delete(key)
      } else {
        this.windows.set(key, valid)
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}
