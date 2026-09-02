/**
 * Build-time plugin feature flags injected by electron.vite.config.ts.
 * Values are inlined at compile time; Rollup removes false branches.
 */
declare const __PLUGIN_COMMERCE__: boolean
declare const __PLUGIN_BAKERY__: boolean
declare const __PLUGIN_RESTAURANT__: boolean
declare const __PLUGIN_WAREHOUSE__: boolean
declare const __PLUGIN_CLINIC__: boolean
declare const __PLUGIN_VET__: boolean
declare const __PLUGIN_GYM__: boolean
declare const __PLUGIN_PHARMACY__: boolean
declare const __PLUGIN_COFFEE__: boolean
declare const __BIZFLOW_LICENSE_PUBLIC_KEY__: string
