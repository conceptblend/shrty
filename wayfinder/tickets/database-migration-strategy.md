# Ticket: Database Migration Strategy

**Labels**: `wayfinder:grilling`
**Status**: closed
**Resolution**: grilling
**Blocked by**: none

## Question

What is the database migration strategy for Shrty?

## Resolution

**`drizzle-kit generate` + `drizzle-kit migrate` only. No `push`.**

One migration path for both development and production. After each schema change, run `drizzle-kit generate` to produce a SQL migration file, then `drizzle-kit migrate` to apply it. No `push` — it creates drift between dev state and migration history that breaks upgrades.

**Migration file location**: `drizzle/` at the project root (Drizzle convention). Contains generated SQL files and a `_journal.json` tracking applied migrations.

**Docker startup**: Entrypoint script runs `drizzle-kit migrate` before starting the server. Container won't start if migrations fail. This means self-hosted users get automatic schema upgrades on `docker-compose pull && docker-compose up`.

```
# Dockerfile entrypoint
#!/bin/sh
npx drizzle-kit migrate
exec node dist/index.js
```

**Initial schema**: First `drizzle-kit generate` produces the initial migration (CREATE TABLE statements). This is checked into the repo — it's the source of truth for the schema.

**Clicks table partitioning**: Deferred to v2. Ship as a regular unpartitioned table in v1. Add partitioning when query performance demands it — this is a performance optimization, not a correctness issue. When ready, create a migration that converts the table to partitioned and a startup routine or cron job that creates monthly partitions ahead of time.

**Development workflow**:

1. Edit schema in `packages/api/src/db/schema.ts`
2. Run `pnpm db:generate` (root script → `drizzle-kit generate`)
3. Run `pnpm db:migrate` to apply locally
4. Generated SQL in `drizzle/` is committed to repo

**Configuration**: `drizzle.config.ts` at project root, pointing at `packages/api/src/db/schema.ts` and `drizzle/` output directory.
