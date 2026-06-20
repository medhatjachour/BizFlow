/**
 * Must be imported BEFORE the BizFlow preload. ES module imports are hoisted,
 * so keeping this in its own module (imported first) guarantees the `process`
 * global exists when the preload reads `process.contextIsolated`.
 */
const g = globalThis as unknown as { process?: Record<string, unknown> };
if (!g.process) {
  g.process = {
    env: { NODE_ENV: "production" },
    platform: "browser",
    contextIsolated: false,
    versions: {},
  };
}

export {};
