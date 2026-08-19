# Ticket: Project Scaffolding Decision

**Labels**: `wayfinder:grilling`
**Status**: closed
**Resolution**: grilling
**Blocked by**: none

## Question

What is the exact project scaffolding for Shrty?

## Resolution

Flat pnpm workspace with three packages:

- **`packages/api/`** — Backend (Hono, Drizzle, Node.js)
- **`packages/web/`** — Frontend (React, Vite, Tailwind, Recharts)
- **`packages/shared/`** — Shared types (Link, ClickEvent, AnalyticsData, API responses). No build step — raw TypeScript consumed via `workspace:*`.

**Root layout**: Root `package.json` with workspace scripts (`dev`, `build`, `test`, `lint`). Root `tsconfig.json` as base config. Root `drizzle.config.ts` referencing `packages/api/src/db/schema.ts`.

**Dev workflow**: `pnpm dev` uses `concurrently` to run both `@shrty/api` (tsx watch) and `@shrty/web` (vite dev server) in parallel.

**Build**: `pnpm -r build` builds all packages. Frontend builds to `packages/web/dist/`. Backend compiles to `packages/api/dist/`.

**Config files**: Root-level for shared tools (tsconfig base, eslint, prettier). Per-package for package-specific tools (drizzle, vitest, vite, tailwind).

**Shared types package**: `@shrty/shared` exports TypeScript types directly (no compilation). Both packages import from it. This avoids type duplication for Link, ClickEvent, AnalyticsData, and API request/response shapes.
