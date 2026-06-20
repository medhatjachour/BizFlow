/**
 * Node-side `electron-log` shim for the bridge server.
 * Supports the API surface used by src/main/utils/logger.ts.
 */
import os from "node:os";
import path from "node:path";

type AnyFn = (...args: unknown[]) => void;

const logFile = path.join(os.tmpdir(), "bizflow-web-data", "app.log");

interface NodeLog {
  info: AnyFn;
  warn: AnyFn;
  error: AnyFn;
  debug: AnyFn;
  verbose: AnyFn;
  initialize: () => void;
  transports: {
    file: {
      level: string;
      format: string;
      resolvePathFn?: (vars: { electronDefaultDir?: string }) => string;
      getFile: () => { path: string };
    };
    console: { level: string; format: string };
  };
  errorHandler: { startCatching: (opts?: unknown) => void };
  scope: () => NodeLog;
}

const log: NodeLog = {
  info: (...a) => console.log("[info]", ...a),
  warn: (...a) => console.warn("[warn]", ...a),
  error: (...a) => console.error("[error]", ...a),
  debug: () => {},
  verbose: () => {},
  initialize: () => {},
  transports: {
    file: {
      level: "debug",
      format: "",
      resolvePathFn: undefined,
      getFile: () => ({ path: logFile }),
    },
    console: { level: "warn", format: "" },
  },
  errorHandler: { startCatching: () => {} },
  scope: () => log,
};

export default log;
export const createLogger = () => log;
