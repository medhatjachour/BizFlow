/**
 * Shared design tokens — the single source of truth for control styling across
 * every plugin and core page. All accent colours resolve from the per-plugin
 * `--accent` CSS variable (set on <body data-plugin> by RootLayout, defined in
 * main.css), so one class themes itself for whatever module is active.
 *
 * Usage:  import { inputCls } from '@renderer/components/ui/tokens'
 *         <input className={inputCls} />
 */

/** Standard text/number/select-like input. Accent focus ring. */
export const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 ' +
  'bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] ' +
  'transition-colors'

/** Native <select>. Same shape as inputCls. */
export const selectCls = inputCls

/** Field label. */
export const labelCls =
  'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

/** Uppercase section label. */
export const labelStrongCls =
  'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'

/** Solid accent button (primary action). */
export const btnAccentCls =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl ' +
  'text-[color:var(--accent-contrast)] bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 ' +
  'disabled:opacity-50 disabled:pointer-events-none transition-colors'

/** Neutral / subtle button (secondary action, Cancel). */
export const btnSubtleCls =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl ' +
  'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 ' +
  'hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ' +
  'disabled:opacity-50 transition-colors'

/** Outline/ghost button with accent text. */
export const btnGhostCls =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl ' +
  'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 ' +
  'hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 disabled:opacity-50 transition-colors'

/** Danger button. */
export const btnDangerCls =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl ' +
  'text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors'

/** Card surface. */
export const cardCls =
  'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
