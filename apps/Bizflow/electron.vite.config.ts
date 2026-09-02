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
  return ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee']
  // return ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic']
}

const enabledPlugins = resolveEnabledPlugins()
function pemFromEnvironment(value: string | undefined): string {
  if (!value) return ''
  if (value.includes('BEGIN')) return value.replace(/\\n/g, '\n')
  return Buffer.from(value, 'base64').toString('utf8')
}

function resolveLicensePublicKey(): string {
  const fromEnvironment = pemFromEnvironment(process.env.BIZFLOW_LICENSE_PUBLIC_KEY)
  if (fromEnvironment) return fromEnvironment

  const bundledKeyPath = resolve('resources/license-public.pem')
  return existsSync(bundledKeyPath) ? readFileSync(bundledKeyPath, 'utf8') : ''
}

// Auto-enable commerce when any dependent plugin is enabled (they reference Product, Customer etc.)
const DEPENDS_ON_COMMERCE = ['restaurant', 'warehouse']
if (DEPENDS_ON_COMMERCE.some(p => enabledPlugins.includes(p)) && !enabledPlugins.includes('commerce')) {
  enabledPlugins.push('commerce')
}

const pluginDefineFlags = {
  __PLUGIN_COMMERCE__: enabledPlugins.includes('commerce'),
  __PLUGIN_BAKERY__: enabledPlugins.includes('bakery'),
  __PLUGIN_RESTAURANT__: enabledPlugins.includes('restaurant'),
  __PLUGIN_WAREHOUSE__: enabledPlugins.includes('warehouse'),
  __PLUGIN_CLINIC__: enabledPlugins.includes('clinic'),
  __PLUGIN_VET__: enabledPlugins.includes('vet'),
  __PLUGIN_GYM__: enabledPlugins.includes('gym'),
  __PLUGIN_PHARMACY__: enabledPlugins.includes('pharmacy'),
  __PLUGIN_COFFEE__: enabledPlugins.includes('coffee'),
}

export default defineConfig(({ command }) => {
  // Development deliberately ships no verification key. Packaged builds embed
  // only the public key, using an explicit CI value when supplied.
  const licensePublicKey = command === 'build' ? resolveLicensePublicKey() : ''
  if (command === 'build' && !licensePublicKey) {
    throw new Error('A public license key is required for packaged builds')
  }
  const defineFlags = {
    ...pluginDefineFlags,
    __BIZFLOW_LICENSE_PUBLIC_KEY__: JSON.stringify(licensePublicKey)
  }

  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    define: defineFlags
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: defineFlags
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
    define: defineFlags,
    plugins: [react()],
    server: {
      hmr: true
    }
  }
  }
})
