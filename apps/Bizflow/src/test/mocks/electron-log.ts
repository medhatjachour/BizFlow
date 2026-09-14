/**
 * Test double for `electron-log`.
 *
 * `electron-log` is a real installed package, so Vitest loaded it with Node
 * instead of transforming it, and the `electron` alias in vitest.config.ts
 * never reached the module-scope `require('electron')` inside it. CI installs
 * with `--ignore-scripts` (deliberately - it still skips Electron's ~100MB
 * runtime download), so that require threw:
 *
 *   Error: Electron failed to install correctly, please delete node_modules/electron
 *     at getElectronPath node_modules/electron/index.js:17:11
 *     at node_modules/electron-log/src/main/index.js:3:18
 *
 * Aliasing the package itself (including its `/main` and `/preload` subpaths)
 * closes that hole for every consumer.
 *
 * Keep this permissive - it exists so imports resolve and log calls are inert,
 * not to emulate electron-log.
 */

import os from 'os'
import path from 'path'

const noop = (): void => undefined

const testLogFile = path.join(os.tmpdir(), 'bizflow-test.log')

const transport = {
  level: 'debug',
  format: '',
  resolvePathFn: noop,
  getFile: () => ({ path: testLogFile, clear: noop, read: () => [], write: noop })
}

const log = {
  initialize: noop,
  create: () => log,
  scope: () => log,
  error: noop,
  warn: noop,
  info: noop,
  verbose: noop,
  debug: noop,
  silly: noop,
  transports: {
    file: { ...transport },
    console: { ...transport },
    ipc: { ...transport }
  },
  errorHandler: { startCatching: noop, catchErrors: noop, stopCatching: noop }
}

export default log
export const transports = log.transports
export const errorHandler = log.errorHandler
