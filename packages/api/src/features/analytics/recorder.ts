import type { EventBus } from '../../lib/events.js'
import type { DrizzleDB } from '../../db/index.js'
import { clicks } from '../../db/schema.js'
import type { AppConfig } from '../../config.js'

interface ClickEventData {
  hash: string
  ipHash: string
  referrer: string | null
  userAgent: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  country: string | null
}

export class AnalyticsRecorder {
  private buffer: ClickEventData[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private db: DrizzleDB,
    private config: AppConfig,
  ) {}

  async record(event: ClickEventData): Promise<void> {
    this.buffer.push(event)

    if (this.buffer.length >= this.config.analytics.batchSize) {
      await this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.config.analytics.flushIntervalMs)
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = this.buffer.splice(0)
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Batch insert
    await this.db.insert(clicks).values(events.map(e => ({
      hash: e.hash,
      ipHash: e.ipHash,
      referrer: e.referrer,
      userAgent: e.userAgent,
      deviceType: e.deviceType,
      browser: e.browser,
      os: e.os,
      country: e.country,
    })))

    // Batch increment click counts
    const counts = new Map<string, number>()
    for (const e of events) {
      counts.set(e.hash, (counts.get(e.hash) || 0) + 1)
    }
    // Import links table for the update
    const { links } = await import('../../db/schema.js')
    const { eq, sql } = await import('drizzle-orm')
    for (const [hash, count] of counts) {
      await this.db.update(links)
        .set({ clickCount: sql`click_count + ${count}` })
        .where(eq(links.hash, hash))
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }
}

export function subscribeAnalyticsEvents(eventBus: EventBus, recorder: AnalyticsRecorder): void {
  eventBus.on('click:recorded', (event) => recorder.record(event))
}
