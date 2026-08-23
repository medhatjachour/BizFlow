import { LocationType } from './types'

export const LOCATION_TYPES: LocationType[] = ['zone', 'aisle', 'shelf', 'bin']

export const TYPE_THEMES: Record<
  string,
  {
    badge: string
    border: string
    dot: string
    iconBg: string
    iconColor: string
  }
> = {
  zone: {
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
    border: 'border-purple-200 dark:border-purple-800/40',
    dot: 'bg-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  aisle: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40',
    border: 'border-sky-200 dark:border-sky-800/40',
    dot: 'bg-sky-500',
    iconBg: 'bg-sky-100 dark:bg-sky-900/40',
    iconColor: 'text-sky-600 dark:text-sky-400'
  },
  shelf: {
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    border: 'border-amber-200 dark:border-amber-800/40',
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  bin: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  }
}