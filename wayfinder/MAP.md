# Wayfinder Map: Shrty v1 Implementation

## Destination

A working v1 implementation of Shrty — a self-hosted link shortener with API, redirect, analytics, and dashboard. The PRD and TRD are written; this map resolves the remaining open questions so implementation can start without further design debate.

## Notes

- **Stack**: Node.js 20, Hono, Drizzle ORM, PostgreSQL 16, React 18 + Vite + Tailwind CSS + Recharts
- **Patterns**: Feature modules, service container (Hono c.var), repository abstraction, event bus, createApp() factory
- **API**: `/api/v1/` prefix (versioned)
- **Deployment**: Docker Compose (app + PostgreSQL)
- **Key decisions already locked**: PostgreSQL-only (no Redis), Feistel cipher hashing, batched analytics writes, 302 redirects, SHA-256 IP hashing, 7-char codes, strict URL validation, pino logging, geoip-lite, ua-parser-js v1, custom sliding window rate limiting

## Decisions so far

- [Project Scaffolding Decision](tickets/project-scaffolding-decision.md) — Flat pnpm workspace: `packages/api/`, `packages/web/`, `packages/shared/`. Root scripts via concurrently. Shared types package with raw TS (no build step).
- [TypeScript Compilation Strategy](tickets/typescript-compilation-strategy.md) — tsx for dev (watch mode, instant startup), tsc for prod (standard compilation to dist/). No bundling. Vite handles frontend TS natively.
- [Database Migration Strategy](tickets/database-migration-strategy.md) — generate + migrate only (no push). drizzle/ at root. Migrations run at Docker container startup. Clicks partitioning deferred to v2.
- [Frontend-Backend Static File Serving](tickets/frontend-backend-serving.md) — Dev: Vite proxy to Hono. Prod: Hono serves static files via serveStatic with configurable root. Route order: API → static → SPA catch-all → redirect. Docker multi-stage build.

## Open Tickets

**Frontier** (unblocked, takeable now):

<!-- empty — all tickets resolved. The way to the destination is clear. -->

## Not yet specified

- Docker image optimization (Alpine vs distroless, layer caching, health checks)
- Custom slug reserved words list (api, admin, static, login, etc.)
- Frontend component composition patterns (how SummaryCards, charts, tables share layout)
- Analytics dashboard time-range selection UI (last 24h / 7d / 30d / all)
- Database connection pooling config (pgBouncer vs native Node pg pool)
- Graceful shutdown specifics (SIGTERM handling, analytics flush, server drain)

## Out of scope

- User accounts / multi-tenancy (v2)
- Custom/branded domains (v2)
- Redis cache layer (v2, if scale demands)
- QR code generation (v2)
- Webhook support for click events (v2)
- A/B testing, geo-targeting, device targeting (v2/v3)
- Link-in-bio pages (v2)
- Conversion tracking (v3)
- CDN edge redirects (v3)
