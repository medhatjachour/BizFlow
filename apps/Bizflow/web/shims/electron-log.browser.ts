/**
 * Browser-side `electron-log` shim — maps logging onto the console.
 * Covers the small surface used by the renderer/preload.
 */
type AnyFn = (...args: unknown[]) => void;

interface WebLogger {
  info: AnyFn;
  warn: AnyFn;
  error: AnyFn;
  debug: AnyFn;
  verbose: AnyFn;
  log: AnyFn;
  scope: () => WebLogger;
  transports: { console: Record<string, unknown>; file: Record<string, unknown> };
  initialize: () => void;
  errorHandler: { startCatching: () => void };
}

function make(): WebLogger {
  const logger: WebLogger = {
    info: (...a) => console.info(...a),
    warn: (...a) => console.warn(...a),
    error: (...a) => console.error(...a),
    debug: (...a) => console.debug(...a),
    verbose: () => {},
    log: (...a) => console.log(...a),
    scope: () => make(),
    transports: { console: {}, file: {} },
    initialize: () => {},
    errorHandler: { startCatching: () => {} },
  };
  return logger;
}

const log = make();
export default log;
export const createLogger = () => make();
