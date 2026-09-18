// ─── Personal Work: shared class tokens ──────────────────────────────────────
// The plugin styles from Tailwind utilities, so a token here is a class string.
// These are the ones every screen repeats; holding them in one place is what
// keeps thirteen tabs looking like one product instead of thirteen experiments.
// ─────────────────────────────────────────────────────────────────────────────

export const CARD =
  'rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800/40'

export const CARD_HEADER =
  'flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-slate-700/70'

/** Uppercase micro-heading that names a band of the screen. */
export const MICRO_LABEL =
  'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

export const META_TEXT = 'text-xs text-slate-500 dark:text-slate-400'

export const TITLE_TEXT = 'text-sm font-semibold text-slate-900 dark:text-white'

export const ROW_SHELL =
  'flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-start transition-colors dark:border-slate-700 dark:bg-slate-800/40'

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]'

export const HOVER_ROW =
  'hover:border-[color:var(--accent-line)] hover:bg-[color:var(--accent-tint)] dark:hover:border-[color:var(--accent-line)]'
