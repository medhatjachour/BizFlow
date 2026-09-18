import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * SHA-256 of the DER-encoded public key that the production license server signs
 * activation certificates with.
 *
 * A wrong key here is catastrophic and silent: the app verifies every activation
 * certificate with it, so a mismatch makes `activateOnline` fail for every
 * customer in the field while the build itself succeeds. That exact bug shipped
 * once (the bundled PEM was one byte off the server's key), so a packaged build
 * now refuses to proceed unless the key matches this fingerprint.
 *
 * If you rotate the signing key pair, update this constant in the same commit.
 * Print the current value with:
 *   node -e "const{createHash}=require('crypto');const fs=require('fs');\
 *   const b=Buffer.from(fs.readFileSync('resources/license-public.pem','utf8')\
 *   .replace(/-----[^-]+-----/g,'').replace(/\s/g,''),'base64');\
 *   console.log(createHash('sha256').update(b).digest('hex'))"
 */
const EXPECTED_LICENSE_KEY_FINGERPRINT =
  '2bd4d4e8dcd00f2d7519b0bc2edd42eb6590b76df29cf285a64a43e580a95c21'

function licenseKeyFingerprint(pem: string): string {
  const der = Buffer.from(
    pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''),
    'base64'
  )
  return createHash('sha256').update(der).digest('hex')
}

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
  return ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee', 'personal']
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
  __PLUGIN_PERSONAL__: enabledPlugins.includes('personal'),
}

export default defineConfig(({ command }) => {
  // Development deliberately ships no verification key. Packaged builds embed
  // only the public key, using an explicit CI value when supplied.
  const licensePublicKey = command === 'build' ? resolveLicensePublicKey() : ''
  if (command === 'build') {
    if (!licensePublicKey) {
      throw new Error('A public license key is required for packaged builds')
    }

    const actualFingerprint = licenseKeyFingerprint(licensePublicKey)
    if (actualFingerprint !== EXPECTED_LICENSE_KEY_FINGERPRINT) {
      throw new Error(
        [
          'License public key does not match the production signing key.',
          `  expected fingerprint: ${EXPECTED_LICENSE_KEY_FINGERPRINT}`,
          `  actual fingerprint:   ${actualFingerprint}`,
          'A build shipped with this key would reject every activation.',
          'Fix: set BIZFLOW_LICENSE_PUBLIC_KEY to the production public key, or restore',
          'resources/license-public.pem. If the signing key was rotated deliberately,',
          'update EXPECTED_LICENSE_KEY_FINGERPRINT in electron.vite.config.ts.',
        ].join('\n')
      )
    }
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
