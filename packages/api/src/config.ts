import { resolve } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

// Load .env from project root
config({ path: resolve(process.cwd(), '../../.env') })

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  databaseUrl: z.string().url(),
  domain: z.string().default('localhost:3000'),
  feistelKey: z.string().min(16),
  apiKey: z.string().min(16),
  staticRoot: z.string().default('../../packages/web/dist'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  analytics: z
    .object({
      batchSize: z.coerce.number().default(100),
      flushIntervalMs: z.coerce.number().default(5000),
    })
    .default({}),
  rateLimit: z
    .object({
      createPerMinute: z.coerce.number().default(60),
    })
    .default({}),
})

export type AppConfig = z.infer<typeof configSchema>

export function loadConfig(): AppConfig {
  return configSchema.parse({
    port: process.env.PORT,
    databaseUrl: process.env.DATABASE_URL,
    domain: process.env.SHRTY_DOMAIN,
    feistelKey: process.env.FEISTEL_KEY,
    apiKey: process.env.SHRTY_API_KEY,
    staticRoot: process.env.SHRTY_STATIC_ROOT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
  })
}
