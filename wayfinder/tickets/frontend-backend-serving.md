# Ticket: Frontend-Backend Static File Serving

**Labels**: `wayfinder:grilling`
**Status**: closed
**Resolution**: grilling
**Blocked by**: project-scaffolding-decision

## Question

How does the Hono backend serve the React frontend build and handle SPA routing?

## Resolution

**Two modes: dev (separate servers) and prod (single process).**

### Development

- Vite dev server runs on `:5173` with HMR
- Hono backend runs on `:3000`
- Vite proxies `/api/*` → `:3000` via `vite.config.ts`:
  ```typescript
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  }
  ```
- Frontend code makes API calls to `/api/v1/...` — same origin in both dev and prod
- No `serveStatic` in dev — Vite handles all frontend serving

### Production (Docker)

**Route registration order in `createApp()`:**

1. `app.route('/api/v1', apiRoutes)` — API endpoints
2. `app.use('/*', serveStatic({ root: '../../packages/web/dist' }))` — static assets (JS, CSS, images)
3. `app.get('/a/:hash', serveStatic({ path: '../../packages/web/dist/index.html' }))` — SPA catch-all for analytics dashboard
4. `app.route('/', redirectRoutes)` — short link redirects (last, catches `/:hash`)
5. `app.get('/*', serveStatic({ root: '../../packages/web/dist' }))` — final SPA fallback

**Why this order**: Static files must be served before the redirect handler. If `/:hash` came first, it would intercept `favicon.ico`, `assets/index-xxx.js`, and other static asset requests. The redirect handler is last — it only catches paths that aren't API routes, static files, or SPA routes.

**Vite config** (`packages/web/vite.config.ts`):

```typescript
export default defineConfig({
  base: '/', // default — relative asset paths in HTML
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

No `base` override needed — Vite's default `base: '/'` produces relative asset references that work when served from any path.

**Dockerfile entrypoint:**

```sh
#!/bin/sh
npx drizzle-kit migrate          # apply schema migrations
exec node packages/api/dist/index.js  # start Hono server
```

**Docker build:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
COPY packages/web/ packages/web/
COPY drizzle.config.ts ./
RUN pnpm -r build                  # builds api (tsc) + web (vite build)

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/api/dist/ packages/api/dist/
COPY --from=builder /app/packages/web/dist/ packages/web/dist/
COPY --from=builder /app/packages/api/node_modules/ packages/api/node_modules/
COPY --from=builder /app/drizzle/ drizzle/
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/packages/api/package.json packages/api/
EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit migrate && node packages/api/dist/index.js"]
```

**Static file root in Hono**: The `root` parameter in `serveStatic` is relative to the process CWD. In Docker, CWD is `/app`, so `../../packages/web/dist` doesn't apply — use `packages/web/dist` directly. The path depends on the Docker WORKDIR:

```typescript
// src/app.ts — configurable static root
const staticRoot = config.staticRoot || '../../packages/web/dist'

app.use('/*', serveStatic({ root: staticRoot }))
```

Set `SHRTY_STATIC_ROOT` env var in Docker:

```yaml
environment:
  SHRTY_STATIC_ROOT: packages/web/dist
```

This keeps the code environment-agnostic — dev uses the default relative path, Docker overrides it.

### Files created/modified

- `packages/web/vite.config.ts` — Vite config with proxy and build output
- `packages/api/src/app.ts` — route registration order, serveStatic with configurable root
- `packages/api/src/config.ts` — add `staticRoot` to config schema
- `Dockerfile` — multi-stage build as above
- `docker-compose.yml` — add `SHRTY_STATIC_ROOT` env var
