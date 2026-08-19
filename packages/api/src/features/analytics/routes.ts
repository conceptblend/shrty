import { Hono } from 'hono'
import { AnalyticsQuery } from './query.js'

export function createAnalyticsRoutes(analyticsQuery: AnalyticsQuery) {
  const app = new Hono()

  // GET /:hash — get analytics for a link
  app.get('/:hash', async (c) => {
    const hash = c.req.param('hash')
    const days = c.req.query('days') ? Number(c.req.query('days')) : 30

    const summary = await analyticsQuery.getSummary(hash, days)
    return c.json(summary)
  })

  return app
}
