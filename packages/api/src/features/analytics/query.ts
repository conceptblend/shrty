import { eq, and, sql, desc, count as drizzleCount, gte } from 'drizzle-orm'
import { clicks, links } from '../../db/schema.js'
import type { DrizzleDB } from '../../db/index.js'
import type { AnalyticsSummary, ClickEvent } from '@shrty/shared'

export class AnalyticsQuery {
  constructor(private db: DrizzleDB) {}

  async getSummary(hash: string, days: number = 30): Promise<AnalyticsSummary> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Fetch link metadata
    const link = await this.db.query.links.findFirst({
      where: eq(links.hash, hash),
    })

    const [clicksByDay, topReferrers, devices, browsers, countries, recentClicks, totalResult] = await Promise.all([
      this.getClicksByDay(hash, since),
      this.getTopReferrers(hash),
      this.getDevices(hash),
      this.getBrowsers(hash),
      this.getCountries(hash),
      this.getRecentClicks(hash, 20),
      this.getTotalClicks(hash),
    ])

    const totalClicks = totalResult ?? 0
    const uniqueVisitors = await this.getUniqueVisitors(hash, since)

    // Calculate percentages for countries
    const countriesWithPercentage = countries.map(c => ({
      ...c,
      percentage: totalClicks > 0 ? Math.round((c.clicks / totalClicks) * 1000) / 10 : 0,
    }))

    return {
      hash,
      destinationUrl: link?.destinationUrl ?? '',
      createdAt: link?.createdAt?.toISOString() ?? '',
      totalClicks,
      uniqueVisitors,
      clicksByDay,
      topReferrers,
      devices,
      browsers,
      countries: countriesWithPercentage,
      recentClicks,
    }
  }

  private async getClicksByDay(hash: string, since: Date) {
    const rows = await this.db
      .select({
        date: sql<string>`DATE(${clicks.clickedAt})`.as('date'),
        clicks: drizzleCount().as('clicks'),
      })
      .from(clicks)
      .where(and(eq(clicks.hash, hash), gte(clicks.clickedAt, since)))
      .groupBy(sql`DATE(${clicks.clickedAt})`)
      .orderBy(desc(sql`DATE(${clicks.clickedAt})`))

    return rows.map(r => ({
      date: r.date,
      clicks: r.clicks,
      uniqueVisitors: 0, // computed separately if needed
    }))
  }

  private async getTopReferrers(hash: string, limit = 10) {
    const rows = await this.db
      .select({
        referrer: clicks.referrer,
        clicks: drizzleCount().as('clicks'),
      })
      .from(clicks)
      .where(and(eq(clicks.hash, hash), sql`${clicks.referrer} IS NOT NULL`))
      .groupBy(clicks.referrer)
      .orderBy(desc(drizzleCount()))
      .limit(limit)

    return rows.map(r => ({
      referrer: r.referrer ?? 'direct',
      clicks: r.clicks,
    }))
  }

  private async getDevices(hash: string) {
    const rows = await this.db
      .select({
        type: clicks.deviceType,
        clicks: drizzleCount().as('clicks'),
      })
      .from(clicks)
      .where(eq(clicks.hash, hash))
      .groupBy(clicks.deviceType)
      .orderBy(desc(drizzleCount()))

    return rows.map(r => ({
      type: r.type ?? 'unknown',
      clicks: r.clicks,
    }))
  }

  private async getBrowsers(hash: string, limit = 10) {
    const rows = await this.db
      .select({
        browser: clicks.browser,
        clicks: drizzleCount().as('clicks'),
      })
      .from(clicks)
      .where(and(eq(clicks.hash, hash), sql`${clicks.browser} IS NOT NULL`))
      .groupBy(clicks.browser)
      .orderBy(desc(drizzleCount()))
      .limit(limit)

    return rows.map(r => ({
      browser: r.browser ?? 'unknown',
      clicks: r.clicks,
    }))
  }

  private async getCountries(hash: string, limit = 10) {
    const rows = await this.db
      .select({
        country: clicks.country,
        clicks: drizzleCount().as('clicks'),
      })
      .from(clicks)
      .where(and(eq(clicks.hash, hash), sql`${clicks.country} IS NOT NULL`))
      .groupBy(clicks.country)
      .orderBy(desc(drizzleCount()))
      .limit(limit)

    return rows.map(r => ({
      country: r.country ?? 'XX',
      clicks: r.clicks,
    }))
  }

  private async getRecentClicks(hash: string, limit = 20): Promise<ClickEvent[]> {
    const rows = await this.db
      .select()
      .from(clicks)
      .where(eq(clicks.hash, hash))
      .orderBy(desc(clicks.clickedAt))
      .limit(limit)

    return rows.map(r => ({
      hash: r.hash,
      clickedAt: r.clickedAt.toISOString(),
      referrer: r.referrer,
      deviceType: r.deviceType,
      browser: r.browser,
      os: r.os,
      country: r.country,
    }))
  }

  private async getTotalClicks(hash: string): Promise<number> {
    const rows = await this.db
      .select({ count: drizzleCount() })
      .from(clicks)
      .where(eq(clicks.hash, hash))

    return rows[0]?.count ?? 0
  }

  private async getUniqueVisitors(hash: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${clicks.ipHash})` })
      .from(clicks)
      .where(and(eq(clicks.hash, hash), gte(clicks.clickedAt, since)))

    return rows[0]?.count ?? 0
  }
}
