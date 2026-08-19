# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

Shrty — a self-hosted link shortener with click analytics. pnpm monorepo:

- `packages/api` — Hono backend (Node 22, TypeScript, ESM)
- `packages/web` — React 18 dashboard (Vite + Tailwind + Recharts)
- `packages/shared` — Shared TypeScript types, no build step (imported as raw `.ts`)

See `docs/PRD.md` and `docs/TRD.md` for product/technical requirements, `docs/adr/` for
architecture decisions, and `wayfinder/MAP.md` for the original planning breakdown.

## Commands

```bash
pnpm install                # install all workspace deps
pnpm dev                    # API on :3000 + Vite on :5173, concurrently
pnpm build                  # build all packages (tsc for api, vite build for web)
pnpm test                   # vitest, run from anywhere in the workspace
pnpm lint                   # eslint .
pnpm format                 # prettier --write .

pnpm db:generate            # drizzle-kit generate — creates migration files in drizzle/
pnpm db:migrate             # drizzle-kit migrate — applies migrations (prod)
pnpm db:push                # drizzle-kit push — dev-only schema sync, no migration files

docker compose up -d        # run app + postgres locally in containers
fly deploy                  # deploy to Fly.io (see README for full setup)
```

Run a single test file: `pnpm vitest run packages/api/src/lib/hash.test.ts`

## Architecture patterns

- **Feature modules** under `packages/api/src/features/<name>/` — each has `routes.ts`,
  `service.ts`, and often `repository.ts` / `drizzle-repository.ts` (interface + impl,
  for testability).
- **Service container** via Hono's typed context (`c.var`). Services are constructed once
  in `createApp()` (`packages/api/src/app.ts`) and injected via middleware, not imported
  as singletons.
- **`createApp(overrides)` factory** — tests pass `overrides` (fake repos, in-memory event
  bus, test config) instead of hitting a real DB. Always wire new services through this
  factory, not module-level instantiation.
- **Event bus** (`packages/api/src/lib/events.ts`) decouples the redirect handler from
  analytics recording — redirects emit `click:recorded`, the analytics recorder subscribes
  and batches writes (100 events or 5s, whichever first).
- **Repository abstraction** — DB access goes through repository interfaces so services
  can be unit-tested without Postgres.

## Critical gotchas (things that have already bitten us)

1. **Feistel hash key (`FEISTEL_KEY`)**: Required env var, min 16 chars. Treat it like a
   password — it deterministically maps DB IDs to short hashes and back. If it changes,
   every existing short link's hash changes (effectively breaking old links). Never
   generate it randomly at boot; it must persist across restarts. See
   `docs/adr/0001-feistel-hash-bounding.md`.

2. **`feistelEncrypt` must return `bigint`**, not `Number` — 64-bit values overflow
   `Number.MAX_SAFE_INTEGER` and silently lose precision, causing hash collisions for
   distinct IDs. (`packages/api/src/lib/hash.ts`)

3. **`links.hash` is nullable in the DB schema.** Hash generation is a two-step process:
   insert the row to get an auto-generated `id`, compute the Feistel hash from that `id`,
   then `UPDATE` the row with the hash. Don't make `hash` NOT NULL without redesigning
   this flow.

4. **`SHRTY_STATIC_ROOT` must be set explicitly in Docker/production.** The default
   (`../../packages/web/dist`) is relative to `packages/api/`'s CWD in local dev. In the
   Docker image the process runs from `/app`, so the same relative path resolves
   incorrectly and `serveStatic` 404s (or logs "root path not found"). The Dockerfile sets
   `ENV SHRTY_STATIC_ROOT=packages/web/dist` in the runner stage — don't remove it.

5. **`drizzle-kit` must be in root `dependencies`, not `devDependencies`.** The production
   Docker image only installs prod deps (`pnpm install --frozen-lockfile --prod`), but
   migrations run via `pnpm exec drizzle-kit migrate` at container boot (see Dockerfile
   `CMD`). If it's a devDependency, the binary won't exist in the runner stage and Fly.io
   machines will loop trying to download it over the network on every boot.

6. **Analytics API (`/api/v1/analytics/:hash`) is intentionally public** — no `Authorization`
   header required, per PRD. Don't add auth middleware to it without checking the PRD first.

7. **`SHRTY_DOMAIN` defaults to `localhost:3000`.** It must be set as a Fly secret
   (`fly secrets set SHRTY_DOMAIN=<your-app>.fly.dev`) or every `shortUrl` returned by the
   create-link API will point at localhost.

8. **`.env` loading uses an explicit path** (`resolve(process.cwd(), '../../.env')` in
   `packages/api/src/config.ts`) because dotenv's default only looks in the CWD, and the
   API's CWD when run via `pnpm --filter` is `packages/api/`, not the repo root.

9. **Drizzle schema indexes use object syntax** (`{ idxName: index(...) }`), not arrays —
   required by drizzle-orm 0.33+. Array syntax silently fails to apply in some versions.

10. **`drizzle/meta/` is committed to git** (removed from `.gitignore` on purpose) — Drizzle
    needs the migration snapshots to compute diffs for future `db:generate` runs.

## Node/pnpm version

Node 22 required (Dockerfile uses `node:22-alpine`). pnpm 11 requires Node 22+.

## Testing conventions

- Vitest, colocated `*.test.ts` files next to source.
- Services are tested with fake repositories passed into `createApp()` overrides, not
  against a real database.
- 36 tests currently pass across hash, validate-url, events, rate-limit, and
  links/service.
