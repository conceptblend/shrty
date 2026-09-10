import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./packages/web/src', import.meta.url)),
    },
  },
  test: {
    include: [
      'packages/api/src/**/*.test.ts',
      'packages/api/test/**/*.test.ts',
      'packages/web/src/**/*.test.ts',
      'packages/web/src/**/*.test.tsx',
    ],
    environment: 'node',
  },
})
