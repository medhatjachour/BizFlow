/**
 * Shared constants and helpers for the Vet Sales tab.
 * Extracted from VetSalesTab.tsx so every sub-component shares one source.
 */

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

export const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'other']

export const PAY_COLOR: Record<string, string> = {
  cash:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  card:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export const GROUP_STATUS: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
}

export const PAGE_SIZE = 15

/** Whole days from now until the given ISO date (negative = already past). */
export function daysUntil(d: string): number {
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000)
}
