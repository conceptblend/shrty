import { eq, and, desc, sql } from 'drizzle-orm'
import { links } from '../../db/schema.js'
import type { DrizzleDB } from '../../db/index.js'
import type { LinkRepository } from './repository.js'
import type { Link, UpdateLinkRequest, LinkListParams, PaginatedLinks } from '@shrty/shared'

export class DrizzleLinkRepository implements LinkRepository {
  constructor(private db: DrizzleDB) {}

  async insert(data: { destinationUrl: string; expiresAt?: Date }) {
    const [row] = await this.db.insert(links).values({
      destinationUrl: data.destinationUrl,
      expiresAt: data.expiresAt ?? null,
    }).returning()
    return row
  }

  async setHash(id: number, hash: string): Promise<void> {
    await this.db.update(links)
      .set({ hash })
      .where(eq(links.id, id))
  }

  async findByHash(hash: string): Promise<Link | null> {
    const row = await this.db.query.links.findFirst({
      where: and(eq(links.hash, hash), eq(links.isDeleted, false)),
    })
    return row ? this.toLink(row) : null
  }

  async findByDestinationUrl(url: string): Promise<Link | null> {
    const row = await this.db.query.links.findFirst({
      where: and(eq(links.destinationUrl, url), eq(links.isDeleted, false)),
    })
    return row ? this.toLink(row) : null
  }

  async update(hash: string, data: UpdateLinkRequest): Promise<Link | null> {
    const updateData: Record<string, unknown> = {}
    if (data.destinationUrl !== undefined) updateData.destinationUrl = data.destinationUrl
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt

    if (Object.keys(updateData).length === 0) {
      return this.findByHash(hash)
    }

    const [row] = await this.db.update(links)
      .set(updateData)
      .where(eq(links.hash, hash))
      .returning()

    return row ? this.toLink(row) : null
  }

  async softDelete(hash: string): Promise<void> {
    await this.db.update(links)
      .set({ isDeleted: true })
      .where(eq(links.hash, hash))
  }

  async list(options: LinkListParams): Promise<PaginatedLinks> {
    const limit = options.limit ?? 20
    const cursor = options.cursor ?? 0

    const rows = await this.db.query.links.findMany({
      where: and(eq(links.isDeleted, false), cursor ? sql`${links.id} > ${cursor}` : undefined),
      orderBy: [desc(links.createdAt)],
      limit: limit + 1,
    })

    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map(r => this.toLink(r))

    return {
      links: items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    }
  }

  async incrementClickCount(hash: string, count: number): Promise<void> {
    await this.db.update(links)
      .set({ clickCount: sql`click_count + ${count}` })
      .where(eq(links.hash, hash))
  }

  private toLink(row: typeof links.$inferSelect): Link {
    return {
      id: row.id,
      hash: row.hash!,
      destinationUrl: row.destinationUrl,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      isDeleted: row.isDeleted,
      clickCount: row.clickCount ?? 0,
    }
  }
}
