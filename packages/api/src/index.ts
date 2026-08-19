import { serve } from '@hono/node-server'
import pino from 'pino'
import { loadConfig } from './config.js'
import { createDb } from './db/index.js'
import { createApp } from './app.js'

const config = loadConfig()
const logger = pino({ level: config.logLevel })
const db = createDb(config.databaseUrl)

const app = createApp({ config, db })

serve({
  fetch: app.fetch,
  port: config.port,
}, () => {
  logger.info(`Shrty running on http://localhost:${config.port}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...')
  process.exit(0)
})
