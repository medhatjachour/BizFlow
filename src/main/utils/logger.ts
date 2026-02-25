/**
 * Main Process Logger
 * Centralised logging via electron-log.
 *
 * One file per day, kept for 30 days, stored in:
 *   Linux  : ~/.config/BizFlow/logs/YYYY-MM-DD.log
 *   Windows: %APPDATA%\BizFlow\logs\YYYY-MM-DD.log
 *   macOS  : ~/Library/Logs/BizFlow/YYYY-MM-DD.log
 *
 * Log levels: error › warn › info › verbose › debug › silly
 */

import fs from 'fs'
import path from 'path'
import log from 'electron-log/main'

// ------------------------------------------------------------------
// Configure once, export everywhere
// ------------------------------------------------------------------
log.initialize()

// ── Daily rotation ────────────────────────────────────────────────
// Resolve a dated filename so each calendar day gets its own file.
log.transports.file.resolvePathFn = (variables) => {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return path.join(variables.electronDefaultDir!, `${date}.log`)
}

// Keep last 30 days; delete anything older on startup.
function pruneOldLogs(logDir: string, keepDays = 30): void {
  try {
    if (!fs.existsSync(logDir)) return
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000
    for (const file of fs.readdirSync(logDir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(file)) continue
      const fullPath = path.join(logDir, file)
      if (fs.statSync(fullPath).mtimeMs < cutoff) fs.unlinkSync(fullPath)
    }
  } catch {
    // non-fatal — logging may not be fully ready yet
  }
}

// File transport
log.transports.file.level = 'debug'
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

// Prune logs older than 30 days on every startup
const logDir = path.dirname(log.transports.file.getFile().path)
pruneOldLogs(logDir)

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
