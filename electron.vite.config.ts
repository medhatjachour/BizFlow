import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Determine which plugins should be bundled at build time.
 * Priority: ENABLED_MODULES env var > .env.build file > default (all).
 */
function resolveEnabledPlugins(): string[] {
  if (process.env.ENABLED_MODULES) {
    return process.env.ENABLED_MODULES.split(',').map((s) => s.trim()).filter(Boolean)
  }
  const envBuild = resolve('.env.build')
  if (existsSync(envBuild)) {
    const match = readFileSync(envBuild, 'utf-8').match(/^ENABLED_MODULES=(.+)$/m)
    if (match) return match[1].split(',').map((s) => s.trim()).filter(Boolean)
  }
  // Default: bundle every known plugin
  return ['bakery', 'restaurant', 'warehouse']
}

const enabledPlugins = resolveEnabledPlugins()

const pluginDefineFlags = {
  __PLUGIN_BAKERY__: enabledPlugins.includes('bakery'),
  __PLUGIN_RESTAURANT__: enabledPlugins.includes('restaurant'),
  __PLUGIN_WAREHOUSE__: enabledPlugins.includes('warehouse')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: pluginDefineFlags
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: pluginDefineFlags
  },
  renderer: {
    base: './',
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@pages': resolve('src/renderer/src/pages'),
        '@components': resolve('src/renderer/src/components'),
        '@': resolve('src')
      }
    },
    /** Build-time plugin feature flags — Rollup tree-shakes disabled branches. */
    define: pluginDefineFlags,
    plugins: [react()],
    server: {
      hmr: true
    }
  }
})
