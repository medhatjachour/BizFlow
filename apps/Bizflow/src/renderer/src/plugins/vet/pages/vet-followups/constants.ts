import type { FollowUpUrgency } from './types'

export const URGENCY_STYLES: Record<FollowUpUrgency, { badge: string; ring: string; labelEn: string; labelAr: string }> = {
  overdue: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    ring: 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/10',
    labelEn: 'Overdue',
    labelAr: 'متأخر ومستحق'
  },
  today: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    ring: 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/10',
    labelEn: 'Due Today',
    labelAr: 'مستحق اليوم'
  },
  tomorrow: {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-900',
    ring: 'border-sky-200/80 dark:border-sky-900/40 bg-sky-50/30 dark:bg-sky-950/10',
    labelEn: 'Tomorrow',
    labelAr: 'غداً'
  },
  this_week: {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-900',
    ring: 'border-teal-200/80 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/10',
    labelEn: 'This Week',
    labelAr: 'خلال هذا الأسبوع'
  },
  upcoming: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ring: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80',
    labelEn: 'Upcoming',
    labelAr: 'قادم'
  }
}