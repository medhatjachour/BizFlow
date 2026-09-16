import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Performance-benchmark configuration.
 *
 * Kept separate from `vitest.config.ts` on purpose:
 *  - the default suite must stay fast and deterministic; these benchmarks
 *    create a temporary SQLite database and insert ~10^5 rows,
 *  - they need a Node environment (the app under measurement talks to Prisma,
 *    not to the DOM),
 *  - they only run when someone asks for them: `npm run perf:bench`.
 *
 * Nothing here is part of `npm test`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/perf/**/*.perf.ts'],
    testTimeout: 900_000,
    hookTimeout: 900_000,
    // Serial: a benchmark that competes with other files for CPU is noise.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    reporters: ['default']
  },
  resolve: {
    // Same Electron doubles as the unit-test config: the services under
    // measurement import `utils/logger`, which imports `electron-log/main`.
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@renderer', replacement: path.resolve(__dirname, './src/renderer/src') },
      { find: '@test', replacement: path.resolve(__dirname, './src/test') },
      { find: /^electron$/, replacement: path.resolve(__dirname, './src/test/mocks/electron.ts') },
      {
        find: /^electron-log(\/.*)?$/,
        replacement: path.resolve(__dirname, './src/test/mocks/electron-log.ts')
      }
    ]
  }
})
