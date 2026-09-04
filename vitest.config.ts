import { defineConfig } from 'vitest/config'

export default defineConfig({
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
