import { Hono } from 'hono'
import { createRedirectHandler } from './handler.js'
import type { EventBus } from '../../lib/events.js'

export function createRedirectRoutes(eventBus: EventBus) {
  const app = new Hono()
  app.get('/:hash', createRedirectHandler(eventBus))
  return app
}
