import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { AppConfig } from './config.js'
import type { EventBus } from './lib/events.js'
import { LinkService } from './features/links/service.js'
import type { LinkRepository } from './features/links/repository.js'
import { DrizzleLinkRepository } from './features/links/drizzle-repository.js'
import { createLinksRoutes } from './features/links/routes.js'
import { AnalyticsRecorder, subscribeAnalyticsEvents } from './features/analytics/recorder.js'
import { AnalyticsQuery } from './features/analytics/query.js'
import { createAnalyticsRoutes } from './features/analytics/routes.js'
import { createRedirectRoutes } from './features/redirects/routes.js'
import {
  createAuthMiddleware,
  createRateLimitMiddleware,
  createErrorHandler,
} from './middleware/index.js'
import { EventBus as EventBusClass } from './lib/events.js'

type AppEnv = {
  Variables: {
    linkService: LinkService
    config: AppConfig
    eventBus: EventBus
  }
}

export type AppOverrides = Partial<{
  linkRepository: LinkRepository
  analyticsRecorder: AnalyticsRecorder
  eventBus: EventBusClass
  config: AppConfig
  db: any
}>

export function createApp(overrides: AppOverrides = {}) {
  const config = overrides.config!
  const eventBus = overrides.eventBus ?? new EventBusClass()

  // DB — either passed in (tests) or created from config
  const db = overrides.db

  // Repositories
  const linkRepo = overrides.linkRepository ?? new DrizzleLinkRepository(db)

  // Services
  const linkService = new LinkService(linkRepo, config)
  const analyticsRecorder = overrides.analyticsRecorder ?? new AnalyticsRecorder(db, config)
  const analyticsQuery = new AnalyticsQuery(db)

  // Subscribe analytics to events
  subscribeAnalyticsEvents(eventBus, analyticsRecorder)

  // Middleware
  const auth = createAuthMiddleware(config)
  const rateLimit = createRateLimitMiddleware(config)
  const errorHandler = createErrorHandler()

  // Build app
  const app = new Hono<AppEnv>()

  // Global error handler
  app.use('*', errorHandler)

  // Inject services into context
  app.use('*', async (c, next) => {
    c.set('linkService', linkService)
    c.set('config', config)
    c.set('eventBus', eventBus)
    await next()
  })

  // API routes (protected)
  const apiLinks = createLinksRoutes(linkService, config)
  const apiAnalytics = createAnalyticsRoutes(analyticsQuery)

  app.route('/api/v1/links', apiLinks.use('*', auth, rateLimit))
  app.route('/api/v1/analytics', apiAnalytics)

  // Static files (production)
  app.use('/assets/*', serveStatic({ root: config.staticRoot }))
  app.use('/favicon.ico', serveStatic({ root: config.staticRoot }))

  // SPA catch-all for /a/:hash dashboard
  app.get('/a/:hash', serveStatic({ root: config.staticRoot, path: 'index.html' }))

  // Short link redirects (last — catches /:hash)
  const redirectRoutes = createRedirectRoutes(eventBus)
  app.route('/', redirectRoutes)

  // Final SPA fallback
  app.get('/*', serveStatic({ root: config.staticRoot }))

  return app
}
