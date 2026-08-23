import { StatColor } from './types'

export const TRANSFER_STATUS_THEMES: Record<
  string,
  { badge: string; dot: string; label: string }
> = {
  draft: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
    label: 'Draft'
  },
  in_transit: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40',
    dot: 'bg-sky-500 animate-pulse',
    label: 'In Transit'
  },
  completed: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    dot: 'bg-emerald-500',
    label: 'Completed'
  },
  cancelled: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40',
    dot: 'bg-rose-500',
    label: 'Cancelled'
  }
}

export const STAT_COLOR_VARIANTS: Record<
  StatColor,
  {
    iconBg: string
    iconColor: string
    hoverBorder: string
    activeGlow: string
  }
> = {
  blue: {
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-800/80',
    activeGlow: 'group-hover:ring-2 group-hover:ring-blue-500/10'
  },
  indigo: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-800/80',
    activeGlow: 'group-hover:ring-2 group-hover:ring-indigo-500/10'
  },
  emerald: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-800/80',
    activeGlow: 'group-hover:ring-2 group-hover:ring-emerald-500/10'
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-800/80',
    activeGlow: 'group-hover:ring-2 group-hover:ring-amber-500/10'
  },
  rose: {
    iconBg: 'bg-rose-50 dark:bg-rose-950/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-800/80',
    activeGlow: 'group-hover:ring-2 group-hover:ring-rose-500/10'
  },
  slate: {
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-700',
    activeGlow: 'group-hover:ring-2 group-hover:ring-slate-500/10'
  }
}