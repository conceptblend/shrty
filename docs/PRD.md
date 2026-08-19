# PRD: Shrty — Link Shortener Service

## 1. Overview

Shrty is a self-hosted link shortener with analytics. It provides URL shortening via a REST API, fast redirects with click tracking, and an analytics dashboard — all under your own domain.

**What we're NOT building**: Another enterprise SaaS link management platform. We're building a fast, simple, self-hosted shortener that does three things well: shorten, redirect, track.

## 2. Problem Statement

Existing link shorteners fall into two camps:

- **SaaS (Bitly, Rebrandly)**: Good UX but expensive, vendor lock-in, free tiers are crippled, your links die if the service dies
- **Self-hosted (YOURLS, Shlink)**: Dated UIs, PHP-based, analytics are afterthoughts, setup is painful

There's no modern, self-hosted link shortener with a clean React UI, solid analytics, and a developer-friendly API that you can deploy in minutes.

## 3. Goals

| Goal               | Success Metric                                              |
| ------------------ | ----------------------------------------------------------- |
| Fast redirects     | < 50ms redirect latency (p95) from API server               |
| Simple API         | Create a shortened URL in 1 API call with < 5 lines of curl |
| Useful analytics   | Click count, referrer, device, geo, and timestamp per link  |
| Clean dashboard    | View analytics for any link at `/<hash>/a`                  |
| Self-hosted        | Single `docker-compose up` to run the whole stack           |
| Developer-friendly | TypeScript end-to-end, OpenAPI spec, SDK-ready              |

## 4. Non-Goals (for v1)

- Custom/branded domains (future — v2)
- User accounts / multi-tenancy (v1 is single-user or API-key scoped)
- A/B testing, geo-targeting, device targeting
- Link-in-bio pages
- QR code generation
- Conversion tracking / revenue attribution
- Webhooks on click events

These are all features that existing players add to justify pricing. We're stripping back to the core value: **shorten, redirect, track**.

> **Future consideration — duplicate destination override**: Currently, creating a link to an already-shortened URL returns the existing short link. A future `allowDuplicate: true` option would bypass this dedup, creating a new short URL for the same destination. Use case: A/B testing the same landing page with distinct short URLs to track performance separately.

## 5. User Stories

### Primary: API Consumer (Developer)

```
As a developer,
I want to shorten a URL via a POST request,
So that I can use short links in emails, tweets, and apps.
```

**Acceptance:**

- `POST /api/v1/shorten` with `{ "url": "https://..." }` returns `{ "shortUrl": "https://domain/abc123", "hash": "abc123" }`
- Optional: `customSlug`, `expiresAt` parameters
- Returns 422 for invalid URLs, 429 for rate limit exceeded

### Primary: Link Visitor (Anonymous)

```
As a visitor,
I want to follow a short link and arrive at the destination,
So that I don't have to copy-paste long URLs.
```

**Acceptance:**

- `GET /<hash>` responds with HTTP 302 redirect to original URL
- Response time < 50ms (p95)
- If link not found, show a clean 404 page (not a server error)
- If link expired, show an expired page with no redirect

### Secondary: Link Owner (Dashboard Viewer)

```
As a link owner,
I want to visit /<hash>/a to see analytics for that link,
So I can understand how my link is performing.
```

**Acceptance:**

- Dashboard shows: total clicks, unique visitors, clicks over time (chart), top referrers, device breakdown, geographic breakdown
- Data updates in near-real-time (< 30s lag)
- Responsive design — works on mobile

### Secondary: API Consumer (Link Management)

```
As a developer,
I want to list, update, and delete my shortened links,
So that I can manage my links programmatically.
```

**Acceptance:**

- `GET /api/v1/links` — list all links with pagination
- `GET /api/v1/links/:hash` — get link details + analytics summary
- `PATCH /api/v1/links/:hash` — update destination URL
- `DELETE /api/v1/links/:hash` — soft-delete (disable redirect)

## 6. Analytics Events

When someone visits `/<hash>`, we capture:

| Event Property | Source                 | Privacy Note                 |
| -------------- | ---------------------- | ---------------------------- |
| `timestamp`    | Server clock           | —                            |
| `short_code`   | URL path               | —                            |
| `ip_hash`      | Request IP (SHA-256'd) | One-way hash,不可逆          |
| `user_agent`   | Request header         | Parsed for device/os/browser |
| `referrer`     | Request header         | Full referrer URL            |
| `country`      | GeoIP lookup           | ISO 3166-1 alpha-2 code      |

**Privacy commitments:**

- Raw IPs are never stored — only SHA-256 hashes for unique visitor estimation
- No cookies set on redirect
- No PII collected beyond what HTTP naturally provides

## 7. Analytics Dashboard Metrics

The dashboard at `/<hash>/a` displays:

1. **Summary cards**: Total clicks, Unique visitors, Top referrer, Top country
2. **Clicks over time**: Line chart (hourly for last 24h, daily for last 30d, weekly for older)
3. **Referrers table**: Breakdown by referrer domain, sorted by count
4. **Devices**: Pie/bar chart — desktop vs mobile vs tablet (parsed from user agent)
5. **Browsers**: Top browsers bar chart
6. **Countries**: Top countries table with flag emoji + click count
7. **Recent clicks**: Scrollable list of individual click events with timestamp, referrer, device, country

## 8. API Specification

### Authentication

- API key via `Authorization: Bearer <key>` header
- Keys are pre-generated, stored in config or database
- Redirects (`GET /<hash>`) are unauthenticated (public)

### Endpoints

| Method   | Path                            | Auth | Description                  |
| -------- | ------------------------------- | ---- | ---------------------------- |
| `POST`   | `/api/v1/shorten`               | Yes  | Create a short link          |
| `GET`    | `/api/v1/links`                 | Yes  | List all links (paginated)   |
| `GET`    | `/api/v1/links/:hash`           | Yes  | Get link details             |
| `PATCH`  | `/api/v1/links/:hash`           | Yes  | Update link destination      |
| `DELETE` | `/api/v1/links/:hash`           | Yes  | Soft-delete link             |
| `GET`    | `/api/v1/links/:hash/analytics` | Yes  | Get analytics data           |
| `GET`    | `/:hash`                        | No   | Redirect to destination      |
| `GET`    | `/a/:hash`                      | No   | Analytics dashboard (web UI) |

### Rate Limits

- Create link: 60 requests/minute per API key
- Redirects: Unlimited (public-facing)
- Analytics queries: 120 requests/minute per API key

## 9. Information Architecture

### Hash Format

- 7-character Base62 (`a-z`, `A-Z`, `0-9`)
- 3.5 trillion possible combinations — no collisions until billions of links
- Generated via `crypto.randomBytes` + Base62 encoding
- Unique constraint in DB + retry on collision (expected: ~0 retries in practice)

### Database Records

**links table:**

```
id              BIGSERIAL PRIMARY KEY
hash            VARCHAR(7) UNIQUE NOT NULL
destination_url TEXT NOT NULL
custom_slug     VARCHAR(32) UNIQUE NULL
created_at      TIMESTAMPTZ DEFAULT NOW()
expires_at      TIMESTAMPTZ NULL
is_deleted      BOOLEAN DEFAULT FALSE
click_count     BIGINT DEFAULT 0 (denormalized counter)
```

**clicks table:**

```
id              BIGSERIAL PRIMARY KEY
hash            VARCHAR(7) NOT NULL (indexed)
clicked_at      TIMESTAMPTZ DEFAULT NOW()
ip_hash         VARCHAR(64) NOT NULL
referrer        TEXT NULL
user_agent      TEXT NULL
device_type     VARCHAR(16) NULL (desktop/mobile/tablet/other)
browser         VARCHAR(32) NULL
os              VARCHAR(32) NULL
country         VARCHAR(2) NULL
```

## 10. UI/UX Design Direction

### Redirect Experience (`/<hash>`)

- No UI — pure HTTP 302 redirect. Zero latency overhead.

### 404 Page

- Clean, minimal page: "This short link doesn't exist or has been removed."
- No broken image, no stack trace.

### Link Expiry Page

- "This link has expired." with no redirect.

### Analytics Dashboard (`/<hash>/a`)

- **Design system**: Use a utility-first CSS framework (Tailwind CSS) for consistency
- **Layout**: Single-page dashboard, no navigation chrome needed
- **Responsive**: Desktop-first, mobile-optimized
- **Color scheme**: Dark mode by default with light mode toggle
- **Charts**: Lightweight charting library (Chart.js or Recharts)
- **Data fetching**: Client-side, polling every 30s for live updates

## 11. Competitive Differentiation

| vs.     | Shrty's Edge                                                            |
| ------- | ----------------------------------------------------------------------- |
| Bitly   | Free, self-hosted, no vendor lock-in, analytics not paywalled           |
| TinyURL | Actually has analytics, modern UI, API                                  |
| Dub.co  | Simpler — no accounts, no conversion tracking complexity                |
| YOURLS  | Modern stack (Node/TS vs PHP), React dashboard, Docker-ready            |
| Shlink  | Node/TS (not PHP), lighter weight, React dashboard                      |
| Kutt    | Purpose-built shortener (Kutt has broader "shortener + pastebin" scope) |

## 12. Security Considerations

- **API key management**: Keys stored hashed (bcrypt) in DB
- **URL validation**: Reject `javascript:`, `file:`, `data:`, internal network URLs
- **Abuse prevention**: Rate limiting on creation API
- **Open redirect protection**: The shortener itself IS an open redirect — that's the point. But we validate that destination URLs are well-formed HTTP(S) URLs.
- **Bot filtering**: Basic bot/scraper detection on analytics (ignore known bot user agents)

## 13. Deployment Model

- **Docker Compose**: `docker-compose.yml` with app + PostgreSQL + Redis containers
- **Environment config**: `.env` file for DB connection, API keys, domain
- **Reverse proxy**: Documented setup for nginx/Caddy in front
- **Single binary option**: Future — could bundle with `embedded-postgres` or use SQLite

## 14. Success Criteria

1. `POST /api/v1/shorten` → working short link in < 200ms
2. `GET /<hash>` → redirect in < 50ms (p95)
3. Analytics dashboard loads in < 1s with < 30s data freshness
4. `docker-compose up` → running service in < 60s
5. Handles 10K+ redirects/second on modest hardware

## 15. Open Questions

1. **SQLite vs PostgreSQL for default?** — SQLite is zero-config but limits concurrent writes. PostgreSQL is production-grade but needs a running server. Recommendation: PostgreSQL default, SQLite as documented alternative.
2. **Custom slugs in v1?** — Adds complexity (reserved word checking, collision with random hashes). Recommend yes but limited.
3. **Anonymous vs authenticated analytics dashboard?** — If anyone can view `/<hash>/a`, anyone can see your link's analytics. Is that okay? Recommendation: dashboard is public (same as the link itself).
