import { Hono } from 'hono'
import { LinkService, LinkError } from './service.js'
import type { AppConfig } from '../../config.js'

export function createLinksRoutes(linkService: LinkService, _config: AppConfig) {
  const app = new Hono()

  // POST / — create a short link
  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      const result = await linkService.create({
        url: body.url,
        customSlug: body.customSlug,
        expiresAt: body.expiresAt,
      })
      return c.json(result, 201)
    } catch (err) {
      if (err instanceof LinkError) {
        return c.json({ error: err.error, message: err.message }, err.status as 422)
      }
      throw err
    }
  })

  // GET / — list all links
  app.get('/', async (c) => {
    const cursor = c.req.query('cursor') ? Number(c.req.query('cursor')) : undefined
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined
    const result = await linkService.list({ cursor, limit })
    return c.json(result)
  })

  // GET /:hash — get link details
  app.get('/:hash', async (c) => {
    const hash = c.req.param('hash')
    const link = await linkService.findByHash(hash)
    if (!link) {
      return c.json({ error: 'Not found', message: 'Link not found' }, 404)
    }
    return c.json(link)
  })

  // PATCH /:hash — update link
  app.patch('/:hash', async (c) => {
    try {
      const hash = c.req.param('hash')
      const body = await c.req.json()
      const link = await linkService.update(hash, body)
      if (!link) {
        return c.json({ error: 'Not found', message: 'Link not found' }, 404)
      }
      return c.json(link)
    } catch (err) {
      if (err instanceof LinkError) {
        return c.json({ error: err.error, message: err.message }, err.status as 422)
      }
      throw err
    }
  })

  // DELETE /:hash — soft-delete link
  app.delete('/:hash', async (c) => {
    const hash = c.req.param('hash')
    const link = await linkService.findByHash(hash)
    if (!link) {
      return c.json({ error: 'Not found', message: 'Link not found' }, 404)
    }
    await linkService.delete(hash)
    return c.json({ success: true })
  })

  return app
}
