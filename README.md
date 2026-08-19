# Shrty

A self-hosted link shortener with analytics.

Shorten URLs via API, redirect visitors with click tracking, and view analytics at `/<hash>/a`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d postgres

# Push schema to database
pnpm db:push

# Start dev servers (API on :3000, Vite on :5173)
pnpm dev
```

## Usage

### Create a short link

```bash
curl -X POST http://localhost:3000/api/v1/links \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

### Follow a short link

Visit `http://localhost:3000/<hash>` — you'll be redirected to the original URL.

### View analytics

Visit `http://localhost:5173/a/<hash>` in a browser (the dashboard is served by Vite in dev mode). The API and redirects remain on port 3000.

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHRTY_API_KEY` | Yes | — | Secret key for API authentication (min 16 chars) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `FEISTEL_KEY` | Yes | — | Secret key for hash generation (min 16 chars) |
| `SHRTY_DOMAIN` | No | `localhost:3000` | Domain for generated short URLs |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `LOG_LEVEL` | No | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |

## Docker

```bash
# Build and run everything
docker compose up -d

# Or with custom env
SHRTY_API_KEY=my-secret docker compose up -d
```

## Development

```bash
pnpm dev              # Run API + frontend concurrently
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Apply migrations
```

**Note on geo tracking:** `geoip-lite` has no data for private/local IPs (`127.0.0.1`, `::1`), so countries will be blank in local dev. To test, pass a public IP via header:

```bash
curl -H "X-Forwarded-For: 8.8.8.8" http://localhost:3000/<hash>
```

## Project Structure

```
shrty/
├── packages/
│   ├── api/          # Hono backend (TypeScript)
│   ├── web/          # React dashboard (Vite + Tailwind)
│   └── shared/       # Shared TypeScript types
├── drizzle/          # Database migrations
├── wayfinder/        # Planning artifacts
└── docs/             # PRD and TRD
```

## API

All endpoints require `Authorization: Bearer <key>` except redirects and the dashboard.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/links` | Create a short link |
| `GET` | `/api/v1/links` | List all links (paginated) |
| `GET` | `/api/v1/links/:hash` | Get link details |
| `PATCH` | `/api/v1/links/:hash` | Update link |
| `DELETE` | `/api/v1/links/:hash` | Soft-delete link |
| `GET` | `/api/v1/analytics/:hash` | Get analytics data |
| `GET` | `/:hash` | Redirect to destination |
| `GET` | `/a/:hash` | Analytics dashboard |

## License

MIT
