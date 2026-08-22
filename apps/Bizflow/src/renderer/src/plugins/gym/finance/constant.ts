import { Period } from './types'

export const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' }
]

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  rent: { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', hex: '#f97316' },
  equipment: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', hex: '#3b82f6' },
  salaries: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', hex: '#8b5cf6' },
  utilities: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', hex: '#f59e0b' },
  marketing: { bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', hex: '#ec4899' },
  maintenance: { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', hex: '#14b8a6' },
  supplies: { bg: 'bg-lime-500/10 dark:bg-lime-500/20', text: 'text-lime-600 dark:text-lime-400', hex: '#84cc16' },
  other: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', hex: '#64748b' }
}

export const FALLBACK_CATEGORY_COLOR = {
  bg: 'bg-slate-500/10 dark:bg-slate-500/20',
  text: 'text-slate-600 dark:text-slate-400',
  hex: '#64748b'
}