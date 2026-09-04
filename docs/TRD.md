# TRD: Shrty — Technical Requirements Document

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Nginx / Caddy                     │
│              (reverse proxy, TLS)                    │
└─────────┬──────────────────────┬────────────────────┘
          │                      │
          ▼                      ▼
   ┌──────────────┐      ┌──────────────┐
   │   Hono API   │      │  Static SPA  │
   │  (redirects, │      │  (Vite build │
   │   shorten,   │      │   served by  │
   │   analytics) │      │   Hono)      │
   └──────┬───────┘      └──────────────┘
          │
          ▼
   ┌──────────────┐
   │  PostgreSQL  │
   │  (single DB) │
   └──────────────┘
```

**Single container deployment**: One Docker image bundles the Hono API server + serves the React SPA as static files. One PostgreSQL container for data.

## 2. Design Patterns & Extensibility

The codebase is organized around six patterns that keep modules decoupled, make dependencies swappable, and leave clean extension points for v2 features (webhooks, custom domains, user accounts).

### 2.1 Feature Modules (Route Composition)

Each domain concept (links, analytics, redirects) is a self-contained Hono sub-app that registers its own routes, middleware, and error handling. Modules are composed via `app.route()`.

```typescript
// Each feature exports a Hono sub-app
// src/features/links/routes.ts
export const linksRoutes = new Hono()
  .post('/', auth, shortenHandler)
  .get('/', auth, listLinksHandler)
  .get('/:hash', auth, getLinkHandler)
  .patch('/:hash', auth, updateLinkHandler)
  .delete('/:hash', auth, deleteLinkHandler)

// src/features/redirects/routes.ts
export const redirectRoutes = new Hono().get('/:hash', redirectHandler)

// src/features/analytics/routes.ts
export const analyticsRoutes = new Hono().get('/:hash', auth, analyticsHandler)

// src/index.ts — composition root
const app = new Hono()
app.route('/api/v1/links', linksRoutes)
app.route('/api/v1/analytics', analyticsRoutes)
app.route('/', redirectRoutes) // catch-all for :hash redirects
```

**Why**: Adding a new feature (e.g., webhooks in v2) means creating `src/features/webhooks/routes.ts` and mounting it — zero changes to existing modules. Each module owns its routes, its service layer, and its DB schema subset.

### 2.2 Service Container (Typed DI via Hono Context)

Dependencies are injected into Hono's request context via middleware and accessed via `c.var`. No DI library needed — Hono's context IS the container.

```typescript
// src/lib/container.ts — defines what goes into the container
export type AppServices = {
    linkService: LinkService
    analyticsRecorder: AnalyticsRecorder
    analyticsQuery: AnalyticsQuery
    hashGenerator: HashGenerator
    config: AppConfig
}

// src/middleware/services.ts — injects services into context
export function createServicesMiddleware(services: AppServices) {
    return createMiddleware<{ Variables: AppServices }>(async (c, next) => {
        c.set('linkService', services.linkService)
        c.set('analyticsRecorder', services.analyticsRecorder)
        c.set('analyticsQuery', services.analyticsQuery)
        c.set('hashGenerator', services.hashGenerator)
        c.set('config', services.config)
        await next()
    })
}

// In route handlers — fully typed access
const shortenHandler = async (c: Context) => {
    const linkService = c.var.linkService  // autocompletes
    const result = await linkService.create({ url: ... })
    return c.json(result, 201)
}
```

**Why**: Swapping PostgreSQL for SQLite means implementing a new `LinkRepository` and passing it to `LinkService` at startup. Tests inject fakes. No import changes in route handlers.

### 2.3 Repository Pattern (DB Abstraction)

Database access is behind repository interfaces, not Drizzle calls in route handlers.

```typescript
// src/features/links/repository.ts
export interface LinkRepository {
    create(data: CreateLinkData): Promise<Link>
    findByHash(hash: string): Promise<Link | null>
    update(hash: string, data: UpdateLinkData): Promise<Link | null>
    softDelete(hash: string): Promise<void>
    list(options: ListOptions): Promise<PaginatedResult<Link>>
}

// src/features/links/drizzle-repository.ts — production implementation
export class DrizzleLinkRepository implements LinkRepository {
    constructor(private db: DrizzleDB) {}

    async findByHash(hash: string): Promise<Link | null> {
        return this.db.query.links.findFirst({
            where: and(eq(linksTable.hash, hash), eq(linksTable.is_deleted, false))
        }) ?? null
    }
    // ...
}

// v2: src/features/links/sqlite-repository.ts — alternative implementation
export class SqliteLinkRepository implements LinkRepository { ... }
```

**Why**:

- v2 adds SQLite as a zero-config alternative — new `SqliteLinkRepository`, same service layer
- v2 adds multi-tenancy — repository filters by `tenant_id` transparently
- Tests use `InMemoryLinkRepository` — no database needed
- Drizzle is isolated behind the interface — swap ORM without touching business logic

### 2.4 Event Emitter for Analytics Pipeline

The analytics pipeline is decoupled via an event system. The redirect handler emits events; multiple consumers can subscribe without the handler knowing about them.

```typescript
// src/lib/events.ts — minimal typed event emitter
type EventMap = {
  'click:recorded': ClickEvent
  'link:created': Link
  'link:deleted': { hash: string }
}

export class EventBus {
  private listeners = new Map<string, Set<Function>>()

  on<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void | Promise<void>,
  ): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
  }

  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const handlers = this.listeners.get(event) ?? new Set()
    await Promise.allSettled([...handlers].map((h) => h(data)))
  }
}

// src/features/redirects/redirect-handler.ts
// Emits event, doesn't know who's listening
const redirectHandler = async (c: Context) => {
  // ... lookup, validate, redirect ...
  await eventBus.emit('click:recorded', clickEvent)
  return c.redirect(destination, 302)
}

// src/features/analytics/recorder-subscriber.ts — subscribes to events
eventBus.on('click:recorded', async (event) => {
  await analyticsRecorder.record(event)
})

// v2: src/features/webhooks/click-subscriber.ts — webhook on click
eventBus.on('click:recorded', async (event) => {
  await webhookDispatcher.dispatch(event)
})
```

**Why**:

- Redirect handler never changes when new consumers are added
- v2 webhooks: one `eventBus.on()` call, zero changes to redirect flow
- v2 real-time dashboard: WebSocket subscriber on `click:recorded`
- Error isolation: one failing subscriber doesn't block others (`Promise.allSettled`)

### 2.5 Config Schema (Validated at Startup)

Configuration is validated once at boot, not scattered across `process.env` reads.

```typescript
// src/config.ts
import { z } from 'zod'

const configSchema = z.object({
  port: z.number().default(3000),
  databaseUrl: z.string().url(),
  domain: z.string().default('localhost:3000'),
  feistelKey: z.string().min(16),
  apiKey: z.string().min(16),
  analytics: z
    .object({
      batchSize: z.number().default(100),
      flushIntervalMs: z.number().default(5000),
    })
    .default({}),
  rateLimit: z
    .object({
      createPerMinute: z.number().default(60),
    })
    .default({}),
})

export type AppConfig = z.infer<typeof configSchema>

export function loadConfig(): AppConfig {
  return configSchema.parse(process.env)
}
```

**Why**:

- Fail fast on misconfiguration — no runtime surprises
- Type-safe — `config.analytics.batchSize` is a `number`, always
- Documented defaults — every env var has a sensible default
- Testable — pass a plain object to `createApp()` instead of env vars

### 2.6 `createApp()` Factory (Testable Composition)

The entire application is created via a factory function that accepts optional dependency overrides.

```typescript
// src/app.ts
export type AppOverrides = Partial<{
  linkRepository: LinkRepository
  analyticsRecorder: AnalyticsRecorder
  eventBus: EventBus
  config: AppConfig
}>

export function createApp(overrides: AppOverrides = {}) {
  const config = overrides.config ?? loadConfig()
  const eventBus = overrides.eventBus ?? new EventBus()

  // Wire up repositories
  const linkRepo = overrides.linkRepository ?? new DrizzleLinkRepository(db)

  // Wire up services
  const linkService = new LinkService(linkRepo, hashGenerator, config)
  const analyticsRecorder = overrides.analyticsRecorder ?? new AnalyticsRecorder(db, config)
  const analyticsQuery = new AnalyticsQuery(db)

  // Subscribe analytics to events
  eventBus.on('click:recorded', (e) => analyticsRecorder.record(e))

  // Build services container
  const services: AppServices = {
    linkService,
    analyticsRecorder,
    analyticsQuery,
    hashGenerator,
    config,
  }

  // Compose Hono app
  const app = new Hono()
  app.use('*', createServicesMiddleware(services))
  app.route('/api/links', linksRoutes)
  app.route('/api/analytics', analyticsRoutes)
  app.route('/', redirectRoutes)
  app.use('/*', serveStatic({ root: './frontend/dist' }))

  return app
}

// src/index.ts — production entry point
const app = createApp()
serve({ fetch: app.fetch, port: loadConfig().port })
```

**Why**: Tests create `createApp({ linkRepository: new InMemoryLinkRepo() })` — no database, no network, instant.

### Summary of Patterns

| Pattern           | Mechanism                      | Extends By                                        |
| ----------------- | ------------------------------ | ------------------------------------------------- |
| Feature Modules   | `app.route()` composition      | Add new `features/*/routes.ts`, mount in `app.ts` |
| Service Container | Hono `c.set()`/`c.var`         | Add new keys to `AppServices` type                |
| Repository        | Interface + Drizzle impl       | New impl class (SQLite, in-memory)                |
| Event Bus         | Typed emitter with `on`/`emit` | New `eventBus.on()` subscriber                    |
| Config Schema     | Zod validation at boot         | New fields with defaults                          |
| App Factory       | `createApp(overrides)`         | New override keys for tests                       |

### Updated Project Structure (with patterns applied)

```
shrty/
├── src/
│   ├── index.ts                    # Production entry — calls createApp()
│   ├── app.ts                      # createApp() factory — wires everything
│   ├── config.ts                   # Zod schema + loadConfig()
│   │
│   ├── lib/                        # Shared utilities (no domain logic)
│   │   ├── events.ts               # EventBus
│   │   ├── hash.ts                 # Feistel cipher + Base62
│   │   ├── geo.ts                  # GeoIP lookup
│   │   ├── user-agent.ts           # UA parsing
│   │   ├── rate-limit.ts           # Sliding window rate limiter
│   │   └── validate-url.ts         # URL validation + blocklist
│   │
│   ├── features/                   # Domain modules (each self-contained)
│   │   ├── links/
│   │   │   ├── routes.ts           # Hono sub-app: CRUD routes
│   │   │   ├── service.ts          # LinkService (business logic)
│   │   │   ├── repository.ts       # LinkRepository interface
│   │   │   ├── drizzle-repository.ts
│   │   │   └── schema.ts           # Drizzle table definitions
│   │   │
│   │   ├── analytics/
│   │   │   ├── routes.ts           # Hono sub-app: analytics API
│   │   │   ├── query.ts            # AnalyticsQuery (read-side)
│   │   │   ├── recorder.ts         # AnalyticsRecorder (write-side, batched)
│   │   │   ├── subscriber.ts       # Event subscriber (click:recorded → recorder)
│   │   │   └── schema.ts           # Drizzle table definitions
│   │   │
│   │   └── redirects/
│   │       ├── routes.ts           # Hono sub-app: GET /:hash → 302
│   │       └── handler.ts          # Redirect logic + event emission
│   │
│   ├── middleware/
│   │   ├── services.ts             # Creates services middleware from AppServices
│   │   ├── auth.ts                 # API key validation
│   │   └── error-handler.ts        # Global error handling
│   │
│   └── db/
│       ├── index.ts                # Drizzle client setup
│       └── migrations/             # Drizzle-generated
│
├── frontend/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   └── Dashboard.tsx
│       ├── components/
│       │   ├── SummaryCards.tsx
│       │   ├── ClickChart.tsx
│       │   ├── ReferrerTable.tsx
│       │   ├── DeviceChart.tsx
│       │   ├── BrowserChart.tsx
│       │   ├── CountryTable.tsx
│       │   └── RecentClicks.tsx
│       ├── hooks/
│       │   ├── useAnalytics.ts
│       │   └── usePolling.ts       # Generic polling hook (extracted)
│       ├── lib/
│       │   ├── api.ts
│       │   └── cn.ts               # Tailwind class merging utility
│       └── types.ts
│
└── test/
    ├── fixtures/                   # Test data builders
    │   └── links.ts
    ├── repositories/               # In-memory implementations
    │   └── in-memory-link-repository.ts
    ├── features/
    │   ├── links.test.ts
    │   ├── analytics.test.ts
    │   └── redirects.test.ts
    └── integration/
        └── api.test.ts
```

## 3. Technology Decisions

| Decision          | Choice            | Rationale                                                                  |
| ----------------- | ----------------- | -------------------------------------------------------------------------- |
| **Runtime**       | Node.js 20 LTS    | Stable, native crypto, excellent ecosystem                                 |
| **API Framework** | Hono              | Fastest Node.js framework, TypeScript-first, edge-ready if needed          |
| **ORM**           | Drizzle ORM       | ~7.4kb, SQL-fluent, fast cold starts, no codegen                           |
| **Database**      | PostgreSQL 16     | Single DB for everything — links + analytics. Sufficient at moderate scale |
| **Frontend**      | React 18 + Vite   | SPA, static build served by Hono                                           |
| **Styling**       | Tailwind CSS 3    | Utility-first, `dark:` prefix for dark mode, minimal custom CSS            |
| **Charts**        | Recharts          | SVG-based, React-native, composable, ~200KB gzipped                        |
| **Docker**        | Multi-stage build | Node builder → production image with just runtime + static files           |

### Why Not Redis?

At self-hosted scale (10K redirects/second peak), PostgreSQL indexed lookups return in <2ms. Redis saves ~1ms — invisible to the user. Adding Redis means another container, cache invalidation logic, and operational surface area. **PostgreSQL-only until proven otherwise.**

### Why Not Next.js?

No SSR benefit — the dashboard is behind `/:hash/a`, fetched client-side. Next.js adds Node.js runtime, API routes (we have Hono), and deployment complexity for a Docker self-hosted app. **Vite SPA is sufficient.**

## 4. Database Schema

```sql
-- Links table — the core mapping
CREATE TABLE links (
    id              BIGSERIAL PRIMARY KEY,
    hash            VARCHAR(7) UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    click_count     BIGINT NOT NULL DEFAULT 0  -- denormalized counter
);

CREATE UNIQUE INDEX idx_links_hash ON links(hash);
CREATE INDEX idx_links_created ON links(created_at);
CREATE INDEX idx_links_expires ON links(expires_at) WHERE expires_at IS NOT NULL;

-- Click events — append-only, write-heavy
CREATE TABLE clicks (
    id          BIGSERIAL PRIMARY KEY,
    hash        VARCHAR(7) NOT NULL,
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash     VARCHAR(64) NOT NULL,     -- SHA-256 of IP, never raw
    referrer    TEXT,
    user_agent  TEXT,
    device_type VARCHAR(16),              -- desktop/mobile/tablet/other
    browser     VARCHAR(32),
    os          VARCHAR(32),
    country     VARCHAR(2)                -- ISO 3166-1 alpha-2
);

-- Partition clicks by month for query performance
CREATE INDEX idx_clicks_hash_time ON clicks(hash, clicked_at);
CREATE INDEX idx_clicks_country ON clicks(country) WHERE country IS NOT NULL;
```

### Partitioning Strategy

Clicks table is partitioned by `clicked_at` (monthly ranges). This keeps index sizes small and makes analytics queries hit only relevant partitions.

```sql
-- Example partition setup
CREATE TABLE clicks (
    -- ... columns above ...
) PARTITION BY RANGE (clicked_at);

CREATE TABLE clicks_2026_08 PARTITION OF clicks
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

Drizzle supports partitioned tables. We'll create new partitions monthly via a migration or cron job.

### Denormalized click_count

`links.click_count` is maintained by the analytics recorder (incremented on each click event). This avoids `COUNT(*)` on the clicks table for the summary card. The dashboard uses this for the total clicks display.

## 5. Hash Generation (Feistel Cipher)

### Overview

Auto-increment ID → Feistel cipher (obfuscation) → Base62 encoding → 7-char hash.

The Feistel cipher is a symmetric structure that turns a sequential counter into a non-sequential, non-predictable output using a secret key. This means:

- **Zero collisions** — each ID maps to exactly one hash
- **Non-enumerable** — can't guess hash N+1 from hash N
- **No retries** — deterministic mapping, no uniqueness check needed

### Implementation

```typescript
// src/lib/hash.ts

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BASE = BigInt(62)
const HASH_LENGTH = 7

// Feistel cipher parameters (stored in env config)
const FEISTEL_ROUNDS = 4
const FEISTEL_KEY = process.env.FEISTEL_KEY || 'default-dev-key-change-me'

function feistelEncrypt(id: number, rounds: number): number {
  const n = BigInt(id)
  const mask = (1n << 32n) - 1n
  let left = (n >> 32n) & mask
  let right = n & mask

  for (let i = 0; i < rounds; i++) {
    const roundKey = deriveRoundKey(i)
    const newRight = left ^ roundKey
    left = right
    right = newRight
  }

  return Number((left << 32n) | right)
}

function deriveRoundKey(round: number): bigint {
  // Simple key derivation — XOR round number with hash of secret key
  const keyHash = crypto.createHash('sha256').update(FEISTEL_KEY).update(round.toString()).digest()
  return keyHash.readBigUInt64BE(0) & ((1n << 32n) - 1n)
}

function encodeBase62(num: bigint): string {
  if (num === 0n) return BASE62_ALPHABET[0]
  let n = num
  let result = ''
  while (n > 0n) {
    result = BASE62_ALPHABET[Number(n % BASE)] + result
    n = n / BASE
  }
  return result
}

export function generateHash(id: number): string {
  const encrypted = feistelEncrypt(id, FEISTEL_ROUNDS)
  const encoded = encodeBase62(BigInt(encrypted))
  return encoded.padStart(HASH_LENGTH, '0')
}
```

### Flow

1. `POST /api/shorten` → insert into `links` table → PostgreSQL assigns `id` via `BIGSERIAL`
2. Run `generateHash(id)` → get 7-char hash
3. `UPDATE links SET hash = $1 WHERE id = $1` (update the row with its hash)
4. Return the short URL to the client

**Alternative simpler flow**: Use PostgreSQL's `RETURNING id` to get the ID after insert, then compute the hash and update. Or use a trigger/function to compute the hash on insert.

## 6. API Design

### POST /api/v1/shorten

**Request:**

```json
{
  "url": "https://example.com/very/long/path?with=params",
  "customSlug": "my-link", // optional
  "expiresAt": "2026-12-31T23:59:59Z" // optional
}
```

**Response (201):**

```json
{
  "hash": "Kx7mN2p",
  "shortUrl": "https://shrty.dev/Kx7mN2p",
  "destinationUrl": "https://example.com/very/long/path?with=params",
  "createdAt": "2026-08-18T12:00:00Z",
  "expiresAt": null
}
```

**Error (422):**

```json
{
  "error": "Invalid URL",
  "message": "URL must use http or https protocol"
}
```

**Error (409):**

```json
{
  "error": "Slug taken",
  "message": "The custom slug 'my-link' is already in use"
}
```

### GET /:hash → 302 Redirect

**Response:**

```
HTTP/1.1 302 Found
Location: https://example.com/very/long/path?with=params
Cache-Control: no-store
```

**Analytics event** is fired asynchronously after the response is sent. The redirect is never blocked by analytics writes.

### GET /api/v1/links/:hash/analytics

**Response (200):**

```json
{
  "hash": "Kx7mN2p",
  "totalClicks": 1523,
  "uniqueVisitors": 891,
  "clicksByDay": [
    { "date": "2026-08-18", "clicks": 45, "uniqueVisitors": 32 },
    { "date": "2026-08-17", "clicks": 67, "uniqueVisitors": 51 }
  ],
  "topReferrers": [
    { "referrer": "twitter.com", "clicks": 312 },
    { "referrer": "reddit.com", "clicks": 189 }
  ],
  "devices": [
    { "type": "mobile", "clicks": 891 },
    { "type": "desktop", "clicks": 567 },
    { "type": "tablet", "clicks": 65 }
  ],
  "browsers": [
    { "browser": "Chrome", "clicks": 780 },
    { "browser": "Safari", "clicks": 412 }
  ],
  "countries": [
    { "country": "US", "clicks": 456, "percentage": 29.9 },
    { "country": "GB", "clicks": 234, "percentage": 15.4 }
  ],
  "recentClicks": [
    {
      "clickedAt": "2026-08-18T12:00:00Z",
      "referrer": "twitter.com",
      "deviceType": "mobile",
      "browser": "Safari",
      "os": "iOS",
      "country": "US"
    }
  ]
}
```

### Authentication

API key via `Authorization: Bearer <key>` header. Keys are stored as bcrypt hashes in an `api_keys` table (or env config for v1 simplicity).

```sql
CREATE TABLE api_keys (
    id          SERIAL PRIMARY KEY,
    key_hash    VARCHAR(64) UNIQUE NOT NULL,  -- bcrypt hash
    name        VARCHAR(64),                   -- label for the key
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_used   TIMESTAMPTZ
);
```

**For v1**: Pre-seed a single API key via environment variable. The key is passed as `SHRTY_API_KEY` in `.env`, hashed on startup for validation.

## 7. Analytics Pipeline

### Recording Flow

```
GET /:hash (redirect handler)
  → [1] Validate hash exists (via LinkService)
  → [2] Send 302 response (DO NOT WAIT FOR ANALYTICS)
  → [3] Emit 'click:recorded' event via EventBus
         ↓
  (EventBus fans out to all subscribers)
         ↓
  → [4] AnalyticsRecorder subscriber:
         - Parse user agent → device, browser, OS
         - SHA-256 hash the IP
         - GeoIP lookup → country code
         - Buffer click event in memory (batch of 100)
         - Flush batch to PostgreSQL:
           · Batch full (100 events)
           · Timer expired (every 5 seconds)
           · Graceful shutdown
         - Increment links.click_count
         ↓
  → [5] (v2) WebhookDispatcher subscriber — POST to configured webhooks
  → [6] (v2) RealTimeDashboard subscriber — push to WebSocket clients
```

### Batched Writes

Click events are buffered in an in-memory array. Every 100 events or every 5 seconds (whichever comes first), a batch INSERT is executed:

```typescript
// src/features/analytics/recorder.ts

export class AnalyticsRecorder {
  private buffer: ClickEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null

  constructor(
    private db: DrizzleDB,
    private config: AppConfig,
  ) {}

  async record(event: ClickEvent): Promise<void> {
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

    await this.db.insert(clicksTable).values(events)

    // Batch increment click counts
    const counts = new Map<string, number>()
    for (const e of events) {
      counts.set(e.hash, (counts.get(e.hash) || 0) + 1)
    }

    for (const [hash, count] of counts) {
      await this.db
        .update(linksTable)
        .set({ clickCount: sql`click_count + ${count}` })
        .where(eq(linksTable.hash, hash))
    }
  }
}
```

### Event Subscriber (wiring recorder to event bus)

```typescript
// src/features/analytics/subscriber.ts

export function subscribeAnalyticsEvents(eventBus: EventBus, recorder: AnalyticsRecorder): void {
  eventBus.on('click:recorded', (event) => recorder.record(event))
}
```

This is called once during app startup in `createApp()`. The redirect handler doesn't know the recorder exists — it only emits events.

### Aggregation Queries

Dashboard data is computed via SQL aggregation queries. At moderate scale (millions of clicks), PostgreSQL handles these without issue:

```sql
-- Clicks by day (last 30 days)
SELECT
    DATE(clicked_at) as date,
    COUNT(*) as clicks,
    COUNT(DISTINCT ip_hash) as unique_visitors
FROM clicks
WHERE hash = $1 AND clicked_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(clicked_at)
ORDER BY date DESC;

-- Top referrers
SELECT referrer, COUNT(*) as clicks
FROM clicks
WHERE hash = $1 AND referrer IS NOT NULL
GROUP BY referrer
ORDER BY clicks DESC
LIMIT 10;

-- Device breakdown
SELECT device_type, COUNT(*) as clicks
FROM clicks
WHERE hash = $1
GROUP BY device_type
ORDER BY clicks DESC;
```

**Performance note**: The `idx_clicks_hash_time` index makes the time-range queries fast. For analytics that need full-table scans (top referrers across all time), we accept slightly slower queries — this is a self-hosted tool, not Bitly.

## 8. Redirect Implementation

```typescript
// src/features/redirects/handler.ts

export const redirectHandler = async (c: Context) => {
  const hash = c.req.param('hash')
  const linkService = c.var.linkService
  const eventBus = c.var.eventBus

  // Skip API routes and static files
  if (hash.startsWith('api') || hash.startsWith('a') || hash.includes('.')) {
    return c.notFound()
  }

  // Look up the link (via repository abstraction)
  const link = await linkService.findByHash(hash)

  if (!link) {
    return c.html(NOT_FOUND_HTML, 404)
  }

  // Check expiration
  if (link.expiresAt && link.expiresAt < new Date()) {
    return c.html(EXPIRED_HTML, 410)
  }

  // Build click event (enriched with request metadata)
  const clickEvent: ClickEvent = {
    hash: link.hash,
    ipHash: sha256(c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'),
    referrer: c.req.header('referer') || null,
    userAgent: c.req.header('user-agent') || null,
    ...parseUserAgent(c.req.header('user-agent') || ''),
    country: geoLookup(c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'),
  }

  // Emit event — don't know or care who's listening
  // AnalyticsRecorder, future webhooks, real-time dashboard all subscribe independently
  eventBus.emit('click:recorded', clickEvent)

  // 302 redirect — never cached, never blocked by analytics
  return c.redirect(link.destinationUrl, 302)
}
```

### 302 vs 301 Decision

**Default: 302 (temporary)**. This ensures every click hits our server for analytics. If a link owner later wants a 301 (permanent, no tracking), we can add that as a per-link config in v2.

`Cache-Control: no-store` on all redirects to prevent intermediary caching.

## 9. Frontend Implementation

### Tech Stack

- **React 18** + **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS 3** for styling
- **Recharts** for charts
- **React Router** for client-side routing (single route: `/:hash/a`)

### Dashboard Layout

```
┌─────────────────────────────────────────────┐
│  Shrty — Link Analytics                     │
│  Hash: Kx7mN2p  |  Created: Aug 18, 2026   │
│  Destination: https://example.com/long/...  │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐│
│ │ Clicks  │ │ Unique  │ │  Top    │ │Top  ││
│ │  1,523  │ │  891    │ │Country  │ │Ref  ││
│ │         │ │         │ │  🇺🇸    │ │twit ││
│ └─────────┘ └─────────┘ └─────────┘ └─────┘│
├─────────────────────────────────────────────┤
│  Clicks Over Time                           │
│  ┌─────────────────────────────────────┐    │
│  │     📈 Line chart (Recharts)        │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
├────────────────────┬────────────────────────┤
│  Top Referrers     │  Devices               │
│  ┌──────────────┐  │  ┌──────────────────┐  │
│  │ twitter  312 │  │  │  🍩 Pie chart    │  │
│  │ reddit   189 │  │  │                  │  │
│  │ github    45 │  │  └──────────────────┘  │
│  └──────────────┘  ├────────────────────────┤
│                    │  Browsers              │
│                    │  ┌──────────────────┐  │
│                    │  │  📊 Bar chart    │  │
│                    │  └──────────────────┘  │
├────────────────────┴────────────────────────┤
│  Countries                                  │
│  ┌─────────────────────────────────────┐    │
│  │ 🇺🇸 US  456 (29.9%)                │    │
│  │ 🇬🇧 GB  234 (15.4%)                │    │
│  │ 🇩🇪 DE  123 ( 8.1%)                │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  Recent Clicks (last 20)                    │
│  ─────────────────────────────────────────  │
│  12:00  twitter.com  Safari/iOS  🇺🇸       │
│  11:58  direct       Chrome/Win  🇬🇧       │
│  11:55  reddit.com   Firefox/Mac 🇨🇦       │
└─────────────────────────────────────────────┘
```

### Tailwind Config

```typescript
// frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### useAnalytics Hook

```typescript
// frontend/src/hooks/useAnalytics.ts

export function useAnalytics(hash: string, pollInterval = 30000) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/links/${hash}/analytics`)
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const json = await res.json()
        if (active) {
          setData(json)
          setLoading(false)
        }
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, pollInterval)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [hash, pollInterval])

  return { data, loading, error }
}
```

### Build + Deployment

Vite builds to `frontend/dist/`. The Hono server serves `frontend/dist/` as static files:

```typescript
// src/index.ts
import { serveStatic } from 'hono/bun' // or hono/nodejs

app.use('/assets/*', serveStatic({ root: './frontend/dist' }))
app.get('/a/:hash', serveStatic({ path: './frontend/dist/index.html' }))
```

The SPA uses client-side routing to match `/a/:hash` and loads the Dashboard component.

## 10. Docker Setup

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://shrty:shrty@postgres:5432/shrty
      - SHRTY_API_KEY=${SHRTY_API_KEY}
      - SHRTY_DOMAIN=${SHRTY_DOMAIN:-localhost:3000}
      - FEISTEL_KEY=${FEISTEL_KEY}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: shrty
      POSTGRES_PASSWORD: shrty
      POSTGRES_DB: shrty
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U shrty']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 11. Configuration

```bash
# .env.example
# Required
SHRTY_API_KEY=your-secret-api-key-here
DATABASE_URL=postgresql://shrty:shrty@localhost:5432/shrty

# Optional
SHRTY_DOMAIN=localhost:3000          # Used to generate short URLs
FEISTEL_KEY=change-this-in-production # Secret key for Feistel cipher
PORT=3000
NODE_ENV=production
```

## 12. Testing Strategy

| Test Type   | Tool                    | What to Test                                                          |
| ----------- | ----------------------- | --------------------------------------------------------------------- |
| Unit        | Vitest                  | Hash generation, URL validation, UA parsing, Feistel cipher, EventBus |
| Integration | Vitest + testcontainers | DB operations via DrizzleLinkRepository, analytics batch flush        |
| Component   | Vitest                  | React dashboard components with mock data                             |
| E2E         | Playwright              | Full dashboard flow: create link → visit → see analytics              |

### Testing Patterns

The `createApp(overrides)` factory makes testing straightforward:

```typescript
// test/features/links.test.ts
import { createApp } from '../../src/app'
import { InMemoryLinkRepository } from '../repositories/in-memory-link-repository'

test('POST /api/links creates a short link', async () => {
  const linkRepo = new InMemoryLinkRepository()
  const app = createApp({ linkRepository: linkRepo })

  const res = await app.request('/api/v1/links', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://example.com' }),
    headers: { Authorization: 'Bearer test-key' },
  })

  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.hash).toHaveLength(7)
  expect(linkRepo.findByHash(body.hash)).resolves.toExist()
})

test('GET /:hash redirects and emits analytics event', async () => {
  const eventBus = new EventBus()
  const captured: ClickEvent[] = []
  eventBus.on('click:recorded', (e) => captured.push(e))

  const linkRepo = new InMemoryLinkRepository()
  await linkRepo.create({ hash: 'abc1234', destinationUrl: 'https://example.com' })

  const app = createApp({ linkRepository: linkRepo, eventBus })
  const res = await app.request('/abc1234')

  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe('https://example.com')
  expect(captured).toHaveLength(1)
  expect(captured[0].hash).toBe('abc1234')
})
```

### Key Test Cases

1. **Hash generation**: Feistel cipher produces non-sequential, non-repeating hashes for sequential IDs
2. **Shorten flow**: Valid URL → returns hash + short URL. Invalid URL → 422.
3. **Redirect flow**: Known hash → 302 to destination. Unknown hash → 404. Expired hash → 410.
4. **Analytics recording**: After redirect, click event is recorded in DB with correct properties
5. **Analytics aggregation**: Dashboard API returns correct counts, breakdowns, time series
6. **Rate limiting**: Exceed rate limit → 429 response
7. **Custom slug**: Duplicate slug → 409. Reserved slug → 422.
8. **Batch flush**: Analytics buffer flushes at 100 events or 5s timeout

## 13. Performance Targets

| Metric                 | Target     | How                                                 |
| ---------------------- | ---------- | --------------------------------------------------- |
| Redirect latency (p95) | < 10ms     | Indexed PostgreSQL lookup, no blocking on analytics |
| Shorten API (p95)      | < 200ms    | Single INSERT + UPDATE                              |
| Dashboard load (p95)   | < 1s       | Static SPA + fast aggregation queries               |
| Clicks buffered flush  | < 5s       | Batch inserts every 5s or 100 events                |
| Concurrent redirects   | 10K+ req/s | Hono + PostgreSQL (single node)                     |

## 14. Security

- **URL validation**: Reject `javascript:`, `file:`, `data:`, private IP ranges (10.x, 192.168.x, etc.)
- **API key**: Bearer token, bcrypt-hashed storage
- **Rate limiting**: Sliding window per API key (60 req/min for creation)
- **IP privacy**: SHA-256 hash, never store raw IPs
- **CORS**: Configurable allowed origins
- **No open redirect abuse**: Destination URLs must be well-formed HTTP(S)

## 15. Migration Path

### v1 (this document)

- Single-user, API-key auth
- PostgreSQL only
- React + Tailwind + Recharts dashboard
- Docker Compose deployment

### v2 (future considerations)

- User accounts + multi-tenancy
- Custom/branded domains
- Redis cache layer (if scale demands)
- QR code generation
- Webhook support for click events
- Link editing (change destination without changing hash)
- 301/302 toggle per link

### v3 (if needed)

- ClickHouse for analytics (if PostgreSQL aggregation queries become slow)
- CDN edge redirects (Cloudflare Workers / Hono edge)
- Conversion tracking
- A/B testing
