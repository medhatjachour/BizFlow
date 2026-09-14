import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * The website had no test runner at all, which is why the account-takeover hole
 * could sit in the sign-up path unnoticed.
 *
 * These run against a real SQLite database rather than mocks: the bug was in a
 * query-writing decision, so a fake would have proved nothing. Point
 * WEBSITE_DATABASE_URL at a scratch file and apply the schema before running.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tests must never run with production semantics - several modules under
    // src/lib throw at import time when NODE_ENV=production and a secret is
    // missing, which would make unrelated suites fail confusingly.
    env: { NODE_ENV: 'test' },
  },
})
