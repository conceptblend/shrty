import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

export function createDb(databaseUrl: string): DrizzleDB {
  const client = postgres(databaseUrl)
  return drizzle(client, { schema })
}
