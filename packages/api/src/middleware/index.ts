import type { Context, Next } from 'hono'
import type { AppConfig } from '../config.js'
import { SlidingWindowRateLimiter } from '../lib/rate-limit.js'

export function createAuthMiddleware(config: AppConfig) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
        401,
      )
    }

    const token = authHeader.slice(7)
    if (token !== config.apiKey) {
      return c.json({ error: 'Unauthorized', message: 'Invalid API key' }, 401)
    }

    await next()
  }
}

export function createRateLimitMiddleware(config: AppConfig) {
  const limiter = new SlidingWindowRateLimiter(config.rateLimit.createPerMinute, 60_000)

  return async (c: Context, next: Next) => {
    const key = c.req.header('authorization') ?? 'anonymous'
    const result = limiter.isAllowed(key)

    c.header('X-RateLimit-Limit', String(config.rateLimit.createPerMinute))
    c.header('X-RateLimit-Remaining', String(result.remaining))

    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil(result.resetMs / 1000)))
      return c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded' }, 429)
    }

    await next()
  }
}

export function createErrorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (err: any) {
      const status = err.status ?? 500
      const message = err.message ?? 'Internal Server Error'
      return c.json({ error: 'Error', message }, status)
    }
  }
}
