import { Stage, OrderPriority } from './types'

export const INBOUND_STEPS: Stage[] = ['created', 'receiving', 'qc', 'putaway', 'done']
export const OUTBOUND_STEPS: Stage[] = ['created', 'picking', 'packing', 'shipping', 'done']

export const STATUS_THEMES: Record<string, { badge: string; dot: string }> = {
  pending: {
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    dot: 'bg-amber-500'
  },
  processing: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40',
    dot: 'bg-sky-500 animate-pulse'
  },
  completed: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    dot: 'bg-emerald-500'
  },
  cancelled: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40',
    dot: 'bg-rose-500'
  },
  draft: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400'
  }
}

export const PRIORITY_THEMES: Record<OrderPriority | string, { badge: string; text: string }> = {
  low: { badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', text: 'Low' },
  normal: { badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400', text: 'Normal' },
  high: { badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400', text: 'High' },
  urgent: { badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold', text: 'Urgent' }
}