import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config for the BizFlow WEB port.
 *
 * Reuses the real renderer (../src/renderer) and preload (../src/preload) but
 * aliases all Electron-only modules to browser shims so the same code runs in a
 * normal browser tab. IPC calls are proxied to the Node bridge on :8787.
 */
const here = __dirname; // .../web
const proj = resolve(here, ".."); // apps/bizflow (the BizFlow app root)

export default defineConfig({
  root: here,
  base: "./",
  plugins: [react()],
  define: {
    // Plugin feature flags (must match the bridge server) — all enabled.
    __PLUGIN_COMMERCE__: "true",
    __PLUGIN_BAKERY__: "true",
    __PLUGIN_RESTAURANT__: "true",
    __PLUGIN_WAREHOUSE__: "true",
    __PLUGIN_CLINIC__: "true",
    __PLUGIN_VET__: "true",
    __PLUGIN_GYM__: "true",
    "process.env.NODE_ENV": '"production"',
  },
  resolve: {
    alias: [
      // Electron shims (longest/most-specific specifiers first).
      { find: "electron-log/preload", replacement: resolve(here, "shims/electron-log.browser.ts") },
      { find: "electron-log/main", replacement: resolve(here, "shims/electron-log.browser.ts") },
      { find: "electron-log", replacement: resolve(here, "shims/electron-log.browser.ts") },
      { find: "@electron-toolkit/preload", replacement: resolve(here, "shims/electron-toolkit-preload.ts") },
      { find: "electron", replacement: resolve(here, "shims/electron.browser.ts") },
      // BizFlow's own path aliases (from electron.vite.config.ts).
      { find: "@renderer", replacement: resolve(proj, "src/renderer/src") },
      { find: "@pages", replacement: resolve(proj, "src/renderer/src/pages") },
      { find: "@components", replacement: resolve(proj, "src/renderer/src/components") },
      { find: "@", replacement: resolve(proj, "src") },
    ],
  },
  // Tailwind/PostCSS config lives at the project root.
  css: { postcss: proj },
  server: {
    port: 5180,
    strictPort: false,
    // Allow importing files from outside the web/ root (../src).
    fs: { allow: [proj] },
    // Forward IPC calls to the bridge server.
    proxy: { "/ipc": "http://localhost:8787" },
  },
  build: {
    outDir: resolve(here, ".dist-web"),
    emptyOutDir: true,
  },
});
