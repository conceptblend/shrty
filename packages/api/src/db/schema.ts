import { pgTable, bigserial, varchar, text, timestamp, boolean, bigint, index } from 'drizzle-orm/pg-core'

export const links = pgTable('links', {
  id: bigserial('id', { mode: 'number' }),
  hash: varchar('hash', { length: 7 }).unique(),
  destinationUrl: text('destination_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false),
  clickCount: bigint('click_count', { mode: 'number' }).notNull().default(0),
}, (table) => ({
  idxLinksCreated: index('idx_links_created').on(table.createdAt),
  idxLinksExpires: index('idx_links_expires').on(table.expiresAt),
}))

export const clicks = pgTable('clicks', {
  id: bigserial('id', { mode: 'number' }),
  hash: varchar('hash', { length: 7 }).notNull(),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
  ipHash: varchar('ip_hash', { length: 64 }).notNull(),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 16 }),
  browser: varchar('browser', { length: 32 }),
  os: varchar('os', { length: 32 }),
  country: varchar('country', { length: 2 }),
}, (table) => ({
  idxClicksHashTime: index('idx_clicks_hash_time').on(table.hash, table.clickedAt),
  idxClicksCountry: index('idx_clicks_country').on(table.country),
}))
