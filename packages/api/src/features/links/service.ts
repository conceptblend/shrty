import type { CreateLinkRequest, CreateLinkResponse, UpdateLinkRequest, LinkListParams, PaginatedLinks, Link } from '@shrty/shared'
import type { LinkRepository } from './repository.js'
import { generateHash } from '../../lib/hash.js'
import { validateDestinationUrl } from '../../lib/validate-url.js'
import type { AppConfig } from '../../config.js'

export class LinkService {
  constructor(
    private repo: LinkRepository,
    private config: AppConfig,
  ) {}

  async create(request: CreateLinkRequest): Promise<CreateLinkResponse> {
    const url = validateDestinationUrl(request.url)
    if (!url) {
      throw new LinkError('Invalid URL', 'URL must use http or https protocol and point to a non-private host', 422)
    }

    // Check for duplicate destination
    const existing = await this.repo.findByDestinationUrl(url.toString())
    if (existing) {
      return {
        hash: existing.hash,
        shortUrl: `https://${this.config.domain}/${existing.hash}`,
        destinationUrl: existing.destinationUrl,
        createdAt: existing.createdAt,
        expiresAt: existing.expiresAt,
      }
    }

    // Step 1: Insert row to get an auto-increment ID
    const row = await this.repo.insert({
      destinationUrl: url.toString(),
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
    })

    // Step 2: Compute hash from ID using Feistel cipher
    const hash = generateHash(row.id, this.config.feistelKey)

    // Step 3: Set the hash on the row
    await this.repo.setHash(row.id, hash)

    return {
      hash,
      shortUrl: `https://${this.config.domain}/${hash}`,
      destinationUrl: url.toString(),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
    }
  }

  async findByHash(hash: string): Promise<Link | null> {
    return this.repo.findByHash(hash)
  }

  async list(options: LinkListParams): Promise<PaginatedLinks> {
    return this.repo.list(options)
  }

  async update(hash: string, data: UpdateLinkRequest): Promise<Link | null> {
    if (data.destinationUrl) {
      const url = validateDestinationUrl(data.destinationUrl)
      if (!url) {
        throw new LinkError('Invalid URL', 'URL must use http or https protocol and point to a non-private host', 422)
      }
      data.destinationUrl = url.toString()
    }
    return this.repo.update(hash, data)
  }

  async delete(hash: string): Promise<void> {
    await this.repo.softDelete(hash)
  }
}

export class LinkError extends Error {
  constructor(
    public readonly error: string,
    public readonly message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}
