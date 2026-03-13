/**
 * Logger Utility — Renderer Process
 * In development: writes to browser console.
 * In production: errors/warnings are forwarded to the main-process log file
 * via the IPC bridge exposed at window.api.log.
 */

type LogFn = (...args: unknown[]) => void

function sendToMain(level: 'info' | 'warn' | 'error' | 'debug', args: unknown[]) {
  try {
    const api = (window as any)?.api?.log
    if (api?.[level]) {
      const [first, ...rest] = args
      const message = typeof first === 'string' ? first : JSON.stringify(first)
      const data = rest.length === 1 ? rest[0] : rest.length > 1 ? rest : undefined
      // Serialize objects so they don't appear as [object Object] in the log file
      const serialized = data !== undefined && typeof data === 'object'
        ? JSON.stringify(data)
        : data
      api[level](message, serialized)
    }
  } catch {
    // Never let logging crash the renderer
  }
}

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export const logger = {
  /** General information */
  info: ((...args) => {
    if (isDevelopment) console.log('ℹ️', ...args)
    else sendToMain('info', args)
  }) as LogFn,

  /** Successful operations */
  success: ((...args) => {
    if (isDevelopment) console.log('✅', ...args)
    else sendToMain('info', args)
  }) as LogFn,

  /** Always logged — forwarded to main log file in production */
  error: ((...args) => {
    console.error('❌', ...args)
    sendToMain('error', args)
  }) as LogFn,

  /** Warnings — forwarded to main log file in production */
  warn: ((...args) => {
    if (isDevelopment) console.warn('⚠️', ...args)
    sendToMain('warn', args)
  }) as LogFn,

  /** Debug — dev only */
  debug: ((...args) => {
    if (isDevelopment) console.debug('🐛', ...args)
  }) as LogFn,

  /** Trace — dev only */
  trace: ((...args) => {
    if (isDevelopment) console.trace('🔍', ...args)
  }) as LogFn
}

export default logger
