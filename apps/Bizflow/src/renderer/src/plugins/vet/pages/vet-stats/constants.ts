import { PeriodPreset } from './types'

export const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🦜',
  rabbit: '🐇',
  guinea_pig: '🐹',
  reptile: '🦎',
  fish: '🐠',
  other: '🐾'
}

export const PERIOD_PRESETS: { id: PeriodPreset; labelKey: string; fallback: string }[] = [
  { id: 'today', labelKey: 'vetFilterToday', fallback: 'Today' },
  { id: 'week', labelKey: 'vetFilterWeek', fallback: 'This Week' },
  { id: 'month', labelKey: 'vetFilterMonth', fallback: 'This Month' },
  { id: 'year', labelKey: 'vetFilterYear', fallback: 'This Year' },
  { id: 'custom', labelKey: 'vetCustomRange', fallback: 'Custom' }
]

export const ALERT_TONE_STYLES: Record<'red' | 'amber' | 'sky', { container: string; icon: string; badge: string }> = {
  red: {
    container: 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-100/50 dark:hover:bg-rose-900/30',
    icon: 'text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/40',
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
  },
  amber: {
    container: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/40',
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
  },
  sky: {
    container: 'border-sky-200/80 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-100/50 dark:hover:bg-sky-900/30',
    icon: 'text-sky-600 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-900/40',
    badge: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
  }
}