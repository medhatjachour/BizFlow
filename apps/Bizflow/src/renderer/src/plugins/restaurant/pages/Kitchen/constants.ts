import { KdsStation, KdsUrgency } from './types'

export const KDS_STATIONS: KdsStation[] = [
  'All',
  'Kitchen',
  'Grill',
  'Bar',
  'Pastry',
  'Cold Station'
]

export const URGENCY_CONFIG: Record<
  KdsUrgency,
  { bg: string; border: string; headerBg: string; text: string; badge: string; label: string }
> = {
  fresh: {
    bg: 'bg-white dark:bg-slate-800/90',
    border: 'border-slate-200 dark:border-slate-700/80',
    headerBg: 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    label: '< 10 min'
  },
  warning: {
    bg: 'bg-amber-50/40 dark:bg-slate-800/90',
    border: 'border-amber-400/80 dark:border-amber-600/60 ring-1 ring-amber-400/30',
    headerBg: 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    text: 'text-amber-600 dark:text-amber-400 font-bold',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    label: '10–20 min'
  },
  critical: {
    bg: 'bg-rose-50/40 dark:bg-slate-800/95',
    border: 'border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/40 animate-pulse',
    headerBg: 'bg-rose-500/20 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300',
    text: 'text-rose-600 dark:text-rose-400 font-black',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    label: '> 20 min OVERDUE'
  }
}