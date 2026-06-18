// Shared vet visit/session types — single source of truth used by the session
// form, session list, patient profile and the statistics comparison.

import { useCallback, useEffect, useState } from 'react'

export const VISIT_TYPES = [
  { value: 'wellness_exam', label: 'Wellness Exam' },
  { value: 'visit',         label: 'Visit' },
  { value: 'consultation',  label: 'Consultation' },
  { value: 'vaccination',   label: 'Vaccination' },
  { value: 'sonar',         label: 'Sonar (Ultrasound)' },
  { value: 'lab_test',      label: 'Lab Test' },
  { value: 'dental',        label: 'Dental' },
  { value: 'surgery',       label: 'Surgery' },
  { value: 'emergency',     label: 'Emergency' },
  { value: 'follow_up',     label: 'Follow-up' },
  { value: 'deworming',     label: 'Deworming' },
  { value: 'grooming',      label: 'Grooming' },
] as const

export const VISIT_TYPE_COLORS: Record<string, string> = {
  wellness_exam: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  visit:         'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  consultation:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  vaccination:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sonar:         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  lab_test:      'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  dental:        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  surgery:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  emergency:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  follow_up:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  deworming:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  grooming:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

// Bar fill colors (solid) for the statistics comparison chart.
export const VISIT_TYPE_BAR: Record<string, string> = {
  wellness_exam: 'bg-teal-500',
  visit:         'bg-cyan-500',
  consultation:  'bg-sky-500',
  vaccination:   'bg-blue-500',
  sonar:         'bg-indigo-500',
  lab_test:      'bg-lime-500',
  dental:        'bg-amber-500',
  surgery:       'bg-red-500',
  emergency:     'bg-orange-500',
  follow_up:     'bg-purple-500',
  deworming:     'bg-emerald-500',
  grooming:      'bg-pink-500',
}

const LABELS: Record<string, string> = VISIT_TYPES.reduce(
  (m, v) => { m[v.value] = v.label; return m },
  {} as Record<string, string>
)

export function visitTypeLabel(type: string): string {
  return LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── DB-backed visit types (user-managed) ──────────────────────────────────────
// Loads the managed visit-type list and exposes label/color lookups that fall
// back to the built-in palette for legacy/unknown values.

export interface VisitType { id: string; name: string; color: string; isDefault: boolean; sortOrder: number }

export function useVisitTypes() {
  const [types, setTypes] = useState<VisitType[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const rows = await (window as any).api?.vet?.visitTypes?.getAll()
      if (Array.isArray(rows)) setTypes(rows)
    } catch { /* fall back to built-ins */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const byName = (name: string) => types.find(t => t.name === name)
  const hexColor = (name: string) => byName(name)?.color
  const label = (name: string) => visitTypeLabel(name)
  // Tailwind class fallback for badges when no DB hex color is known.
  const badgeClass = (name: string) => VISIT_TYPE_COLORS[name] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'

  // Options for a <select>: DB list when present, else built-in defaults.
  const options: Array<{ value: string; label: string; color?: string }> = types.length
    ? types.map(t => ({ value: t.name, label: visitTypeLabel(t.name), color: t.color }))
    : VISIT_TYPES.map(v => ({ value: v.value, label: v.label }))

  return { types, options, loading, reload, hexColor, label, badgeClass }
}
