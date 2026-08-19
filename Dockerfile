FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
COPY packages/web/ packages/web/
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY drizzle/ drizzle/

# Build all packages
RUN pnpm -r build

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy build artifacts
COPY --from=base /app/packages/shared/src/ packages/shared/src/
COPY --from=base /app/packages/api/dist/ packages/api/dist/
COPY --from=base /app/packages/web/dist/ packages/web/dist/
COPY --from=base /app/drizzle/ drizzle/
COPY --from=base /app/drizzle.config.ts ./

ENV SHRTY_STATIC_ROOT=packages/web/dist
EXPOSE 3000

CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && node packages/api/dist/index.js"]
