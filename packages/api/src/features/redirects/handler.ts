import { createHash } from 'crypto'
import type { EventBus } from '../../lib/events.js'
import { lookupCountry } from '../../lib/geo.js'
import { parseUserAgent } from '../../lib/user-agent.js'

export function createRedirectHandler(eventBus: EventBus) {
  return async (c: any) => {
    const hash = c.req.param('hash')

    // Skip API routes and special paths
    if (hash.startsWith('api') || hash.startsWith('a') || hash.includes('.')) {
      return c.notFound()
    }

    // Look up the link — injected via middleware
    const linkService = c.get('linkService')
    const link = await linkService.findByHash(hash)

    if (!link) {
      return c.text('This short link does not exist.', 404)
    }

    // Check expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return c.text('This link has expired.', 410)
    }

    // Build click event
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex')
    const userAgent = c.req.header('user-agent') || null
    const { deviceType, browser, os } = parseUserAgent(userAgent)
    const country = lookupCountry(ip)

    // Emit event — fire and forget, never block the redirect
    eventBus.emit('click:recorded', {
      hash: link.hash,
      ipHash,
      referrer: c.req.header('referer') || null,
      userAgent,
      deviceType,
      browser,
      os,
      country,
    })

    // 302 redirect — never cached
    c.header('Cache-Control', 'no-store')
    return c.redirect(link.destinationUrl, 302)
  }
}
