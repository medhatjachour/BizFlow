// Constants and pure presentation helpers for the clinic Materials tab.

export const UNITS = ['piece', 'box', 'pack', 'ml', 'mg', 'g', 'kg', 'L', 'unit', 'vial', 'tube', 'roll', 'set']

export const COLOR_OPTIONS = [
  { value: 'teal',    label: 'Teal' },
  { value: 'violet',  label: 'Violet' },
  { value: 'blue',    label: 'Blue' },
  { value: 'indigo',  label: 'Indigo' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'cyan',    label: 'Cyan' },
  { value: 'amber',   label: 'Amber' },
  { value: 'rose',    label: 'Rose' },
  { value: 'slate',   label: 'Slate' },
]

export function categoryBadgeCls(color: string): string {
  const map: Record<string, string> = {
    teal:    'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
    violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    blue:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
    indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cyan:    'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-400',
    amber:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    rose:    'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400',
    slate:   'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  }
  return map[color] ?? map.slate
}

export function expiryStatus(expiryDate?: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiryDate) return 'none'
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp < now) return 'expired'
  const soon = new Date(); soon.setDate(now.getDate() + 30)
  if (exp <= soon) return 'soon'
  return 'ok'
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString() } catch { return '—' }
}
