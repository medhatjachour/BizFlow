/**
 * Build-time plugin feature flags injected by electron.vite.config.ts.
 * Values are inlined at compile time; Rollup removes false branches.
 */
declare const __PLUGIN_BAKERY__: boolean
declare const __PLUGIN_RESTAURANT__: boolean
declare const __PLUGIN_WAREHOUSE__: boolean
