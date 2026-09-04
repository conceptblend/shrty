import { describe, it, expect, beforeEach } from 'vitest'
import { LinkService, LinkError } from './service.js'
import { InMemoryLinkRepository } from './repository.js'
import type { AppConfig } from '../../config.js'

const testConfig: AppConfig = {
  port: 3000,
  databaseUrl: 'postgresql://test',
  domain: 'localhost:3000',
  feistelKey: 'test-secret-key-for-feistel',
  apiKey: 'test-api-key-12345678',
  staticRoot: './dist',
  nodeEnv: 'test',
  logLevel: 'info',
  analytics: { batchSize: 100, flushIntervalMs: 5000 },
  rateLimit: { createPerMinute: 60 },
}

describe('LinkService', () => {
  let repo: InMemoryLinkRepository
  let service: LinkService

  beforeEach(() => {
    repo = new InMemoryLinkRepository()
    service = new LinkService(repo, testConfig)
  })

  describe('create', () => {
    it('creates a short link from a valid URL', async () => {
      const result = await service.create({ url: 'https://example.com' })

      expect(result.hash).toHaveLength(7)
      expect(result.shortUrl).toBe(`https://localhost:3000/${result.hash}`)
      expect(result.destinationUrl).toBe('https://example.com/')
      expect(result.createdAt).toBeDefined()
    })

    it('rejects invalid URLs', async () => {
      await expect(service.create({ url: 'not-a-url' }))
        .rejects.toThrow(LinkError)
    })

    it('rejects javascript: URLs', async () => {
      await expect(service.create({ url: 'javascript:alert(1)' }))
        .rejects.toThrow(LinkError)
    })

    it('rejects private IP URLs', async () => {
      await expect(service.create({ url: 'http://192.168.1.1/' }))
        .rejects.toThrow(LinkError)
    })

    it('returns existing link for duplicate destination', async () => {
      const first = await service.create({ url: 'https://example.com' })
      const second = await service.create({ url: 'https://example.com' })

      expect(second.hash).toBe(first.hash)
    })
  })

  describe('findByHash', () => {
    it('finds an existing link', async () => {
      const created = await service.create({ url: 'https://example.com' })
      const found = await service.findByHash(created.hash)

      expect(found).not.toBeNull()
      expect(found!.destinationUrl).toBe('https://example.com/')
    })

    it('returns null for unknown hash', async () => {
      const found = await service.findByHash('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('updates the destination URL', async () => {
      const created = await service.create({ url: 'https://example.com' })
      const updated = await service.update(created.hash, {
        destinationUrl: 'https://different.com',
      })

      expect(updated).not.toBeNull()
      expect(updated!.destinationUrl).toBe('https://different.com/')
    })

    it('returns null for unknown hash', async () => {
      const result = await service.update('nonexistent', { destinationUrl: 'https://x.com' })
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('soft-deletes a link', async () => {
      const created = await service.create({ url: 'https://example.com' })
      await service.delete(created.hash)

      const found = await service.findByHash(created.hash)
      expect(found).toBeNull()
    })
  })

  describe('list', () => {
    it('lists links with pagination', async () => {
      await service.create({ url: 'https://a.com' })
      await service.create({ url: 'https://b.com' })
      await service.create({ url: 'https://c.com' })

      const page1 = await service.list({ limit: 2 })
      expect(page1.links).toHaveLength(2)
      expect(page1.nextCursor).not.toBeNull()

      const page2 = await service.list({ limit: 2, cursor: page1.nextCursor! })
      expect(page2.links).toHaveLength(1)
      expect(page2.nextCursor).toBeNull()
    })
  })
})
