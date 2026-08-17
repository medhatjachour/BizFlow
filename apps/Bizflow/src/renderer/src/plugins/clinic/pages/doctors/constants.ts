import type { DayKey, LiveStatus, WorkingHours } from './types'

export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat'
}

export const STATUS_META: Record<LiveStatus, { label: string; dot: string; text: string; ring: string; bg: string }> = {
  available: {
    label: 'Available',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-400/30',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40'
  },
  busy: {
    label: 'With patient',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-400/30',
    bg: 'bg-amber-50 dark:bg-amber-950/40'
  },
  off: {
    label: 'Off today',
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
    ring: 'ring-slate-400/30',
    bg: 'bg-slate-50 dark:bg-slate-800/40'
  },
  on_leave: {
    label: 'On leave',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
    ring: 'ring-violet-400/30',
    bg: 'bg-violet-50 dark:bg-violet-950/40'
  },
  inactive: {
    label: 'Inactive',
    dot: 'bg-slate-300',
    text: 'text-slate-400 dark:text-slate-500',
    ring: 'ring-slate-300/30',
    bg: 'bg-slate-100 dark:bg-slate-800/20'
  }
}

export const AVATAR_SWATCHES = [
  '#0d9488', '#0891b2', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#2563eb', '#c026d3', '#dc2626', '#ca8a04'
]

export function defaultWorkingHours(): WorkingHours {
  const wh: WorkingHours = {}
  for (const d of DAY_KEYS) {
    wh[d] = d === 'fri' || d === 'sat'
      ? { off: true }
      : { start: '09:00', end: '17:00', off: false }
  }
  return wh
}