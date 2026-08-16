export const CAPACITY_THRESHOLDS = {
  READY_MIN_BATCHES: 5,
  LOW_STOCK_PERCENT: 35,
  CRITICAL_EXPIRY_HOURS: 24,
  WARNING_EXPIRY_HOURS: 48,
} as const

export const KPI_COLOR_THEMES = {
  blue: {
    bg: 'from-sky-500/10 via-blue-500/5 to-transparent dark:from-sky-500/15 dark:via-blue-500/5',
    border: 'border-sky-200/60 dark:border-sky-800/40',
    text: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
  },
  green: {
    bg: 'from-emerald-500/10 via-green-500/5 to-transparent dark:from-emerald-500/15 dark:via-green-500/5',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
  },
  amber: {
    bg: 'from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-500/15 dark:via-orange-500/5',
    border: 'border-amber-200/60 dark:border-amber-800/40',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
  },
  orange: {
    bg: 'from-orange-500/10 via-rose-500/5 to-transparent dark:from-orange-500/15 dark:via-rose-500/5',
    border: 'border-orange-200/60 dark:border-orange-800/40',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
  },
  purple: {
    bg: 'from-violet-500/10 via-purple-500/5 to-transparent dark:from-violet-500/15 dark:via-purple-500/5',
    border: 'border-violet-200/60 dark:border-violet-800/40',
    text: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
  },
  gray: {
    bg: 'from-slate-500/5 to-transparent dark:from-slate-800/40',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-500 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
  }
} as const