import { ReservationStatus } from './types'

export const RESERVATION_STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  },
  seated: {
    label: 'Seated',
    bg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500 animate-pulse'
  },
  completed: {
    label: 'Completed',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400'
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500'
  },
  no_show: {
    label: 'No-Show',
    bg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500'
  }
}

export const GUEST_TAG_SUGGESTIONS = [
  'VIP',
  'Birthday',
  'Anniversary',
  'Window Seat',
  'High Chair',
  'Quiet Table',
  'Allergy: Nuts',
  'Allergy: Gluten',
  'Outdoor / Patio'
]

export const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' }
]