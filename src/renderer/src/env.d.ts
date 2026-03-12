/// <reference types="vite/client" />

/**
 * Build-time plugin feature flags injected by electron.vite.config.ts.
 * Rollup's dead-code elimination removes disabled plugin branches from the bundle.
 */
declare const __PLUGIN_BAKERY__: boolean
declare const __PLUGIN_RESTAURANT__: boolean
declare const __PLUGIN_WAREHOUSE__: boolean
