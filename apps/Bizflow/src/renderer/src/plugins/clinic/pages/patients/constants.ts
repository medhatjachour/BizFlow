import { BloodType,  PatientFilterState } from './types'

export const PAGE_SIZE = 30

export const BLOOD_TYPE_COLORS: Record<BloodType, { badge: string; text: string; dot: string }> = {
  'A+': { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800', text: 'text-rose-600', dot: 'bg-rose-500' },
  'A-': { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800', text: 'text-rose-600', dot: 'bg-rose-500' },
  'B+': { badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800', text: 'text-sky-600', dot: 'bg-sky-500' },
  'B-': { badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800', text: 'text-sky-600', dot: 'bg-sky-500' },
  'O+': { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  'O-': { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  'AB+': { badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800', text: 'text-violet-600', dot: 'bg-violet-500' },
  'AB-': { badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800', text: 'text-violet-600', dot: 'bg-violet-500' }
}

export const VISIT_TYPE_MAP: Record<string, { label: string; cls: string }> = {
  first_visit: { label: 'First Visit', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  follow_up: { label: 'Follow-up', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  routine: { label: 'Routine', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
  emergency: { label: 'Emergency', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse' }
}

export const AVATAR_GRADIENTS = [
  'from-teal-500 to-emerald-600',
  'from-cyan-500 to-blue-600',
  'from-indigo-500 to-violet-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600'
]

export const DEFAULT_FILTER_STATE: PatientFilterState = {
  search: '',
  gender: '',
  bloodType: '',
  hasOutstandingOnly: false,
  sortBy: 'name',
  sortOrder: 'asc'
}