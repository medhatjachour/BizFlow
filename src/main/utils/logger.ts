/**
 * Main Process Logger
 * Centralised logging via electron-log.
 * Writes to:
 *   Linux  : ~/.config/BizFlow/logs/main.log
 *   Windows: %APPDATA%\BizFlow\logs\main.log
 *   macOS  : ~/Library/Logs/BizFlow/main.log
 *
 * Log levels: error › warn › info › verbose › debug › silly
 * All levels are written to file; console shows everything in dev,
 * only warn+ in production.
 */

import log from 'electron-log/main'

// ------------------------------------------------------------------
// Configure once, export everywhere
// ------------------------------------------------------------------
log.initialize()

// File transport
log.transports.file.level = 'debug'
log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB per file
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

// Console transport — always debug in dev, warn+ in prod
const isDev = process.env.NODE_ENV === 'development'
log.transports.console.level = isDev ? 'debug' : 'warn'
log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}'

// Catch uncaught errors in main process automatically
log.errorHandler.startCatching({
  showDialog: false,
  onError: ({ error }) => {
    log.error('[Process] Uncaught error:', error)
  }
})

export default log

/**
 * Create a namespaced child logger for a specific module.
 * Usage:
 *   import { createLogger } from '../utils/logger'
 *   const log = createLogger('products')
 *   log.info('fetching products')  →  [products] fetching products
 */
export function createLogger(namespace: string) {
  return {
    info:    (...args: unknown[]) => log.info( `[${namespace}]`, ...args),
    warn:    (...args: unknown[]) => log.warn( `[${namespace}]`, ...args),
    error:   (...args: unknown[]) => log.error(`[${namespace}]`, ...args),
    debug:   (...args: unknown[]) => log.debug(`[${namespace}]`, ...args),
    verbose: (...args: unknown[]) => log.verbose(`[${namespace}]`, ...args),
  }
}
