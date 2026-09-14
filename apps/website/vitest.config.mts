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
    // These suites share one SQLite file and each clears the tables it uses, so
    // they must not run at the same time - in parallel they delete each other's
    // rows mid-test and fail with "No record was found for an update".
    fileParallelism: false,
    // Tests must never run with production semantics - several modules under
    // src/lib throw at import time when NODE_ENV=production and a secret is
    // missing, which would make unrelated suites fail confusingly.
    //
    // LICENSE_SECRET has to be present even outside production: `lib/license.ts`
    // resolves it at module scope and throws if it is absent, and it is reached
    // transitively from `lib/commerce-db.ts`. So merely importing the support
    // ticket route fails without it. That fragility is real and is recorded in
    // the review; these values are deliberately obvious test placeholders.
    env: {
      NODE_ENV: 'test',
      LICENSE_SECRET: 'test-only-license-secret',
      ADMIN_PASSWORD: 'test-only-admin-password',
    },
  },
})
