import type { Link, UpdateLinkRequest, LinkListParams, PaginatedLinks } from '@shrty/shared'

export interface LinkRepository {
  insert(data: { destinationUrl: string; expiresAt?: Date }): Promise<{
    id: number
    hash: string | null
    destinationUrl: string
    createdAt: Date
    expiresAt: Date | null
    isDeleted: boolean
    clickCount: number
  }>
  setHash(id: number, hash: string): Promise<void>
  findByHash(hash: string): Promise<Link | null>
  findByDestinationUrl(url: string): Promise<Link | null>
  update(hash: string, data: UpdateLinkRequest): Promise<Link | null>
  softDelete(hash: string): Promise<void>
  list(options: LinkListParams): Promise<PaginatedLinks>
  incrementClickCount(hash: string, count: number): Promise<void>
}

// In-memory implementation for testing
export class InMemoryLinkRepository implements LinkRepository {
  private links = new Map<string, Link>()
  private nextId = 1

  async insert(data: { destinationUrl: string; expiresAt?: Date }) {
    const id = this.nextId++
    const row = {
      id,
      hash: '', // placeholder
      destinationUrl: data.destinationUrl,
      createdAt: new Date(),
      expiresAt: data.expiresAt ?? null,
      isDeleted: false,
      clickCount: 0,
    }
    // Store by ID temporarily
    this.links.set(`__id_${id}`, row as unknown as Link)
    return row
  }

  async setHash(id: number, hash: string) {
    const tempKey = `__id_${id}`
    const row = this.links.get(tempKey)
    if (row) {
      this.links.delete(tempKey)
      row.hash = hash
      this.links.set(hash, row)
    }
  }

  async findByHash(hash: string): Promise<Link | null> {
    const link = this.links.get(hash)
    if (!link || link.isDeleted) return null
    return link
  }

  async findByDestinationUrl(url: string): Promise<Link | null> {
    for (const link of this.links.values()) {
      if (link.destinationUrl === url && !link.isDeleted) return link
    }
    return null
  }

  async update(hash: string, data: UpdateLinkRequest): Promise<Link | null> {
    const link = this.links.get(hash)
    if (!link || link.isDeleted) return null
    if (data.destinationUrl !== undefined) link.destinationUrl = data.destinationUrl
    if (data.expiresAt !== undefined) link.expiresAt = data.expiresAt
    return link
  }

  async softDelete(hash: string): Promise<void> {
    const link = this.links.get(hash)
    if (link) link.isDeleted = true
  }

  async list(options: LinkListParams): Promise<PaginatedLinks> {
    const limit = options.limit ?? 20
    const cursor = options.cursor ?? 0
    const all = [...this.links.values()].filter((l) => !l.isDeleted && l.hash !== '')
    const start = all.findIndex((l) => l.id > cursor)
    const sliced = start === -1 ? [] : all.slice(start, start + limit + 1)
    const hasMore = sliced.length > limit
    const items = sliced.slice(0, limit)
    return {
      links: items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    }
  }

  async incrementClickCount(hash: string, count: number): Promise<void> {
    const link = this.links.get(hash)
    if (link) link.clickCount += count
  }
}
