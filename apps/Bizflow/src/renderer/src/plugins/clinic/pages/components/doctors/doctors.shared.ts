// Shared helpers for the clinic multi-doctor UI.

export const SINGLE_DOCTOR_KEY = 'clinicSingleDoctorMode'

export function isSingleDoctorMode(): boolean {
  return localStorage.getItem(SINGLE_DOCTOR_KEY) === 'true'
}
export function setSingleDoctorMode(v: boolean): void {
  localStorage.setItem(SINGLE_DOCTOR_KEY, String(v))
}

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type DayKey = (typeof DAY_KEYS)[number]
export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat'
}

export interface WorkingDay { start?: string; end?: string; off?: boolean }
export type WorkingHours = Partial<Record<DayKey, WorkingDay>>

export function defaultWorkingHours(): WorkingHours {
  const wh: WorkingHours = {}
  for (const d of DAY_KEYS) {
    wh[d] = d === 'fri' || d === 'sat' ? { off: true } : { start: '09:00', end: '17:00', off: false }
  }
  return wh
}

export function parseWorkingHours(raw: string | null | undefined): WorkingHours | null {
  if (!raw) return null
  try { const p = JSON.parse(raw); return typeof p === 'object' && p ? p : null } catch { return null }
}

// ─── Live status presentation ────────────────────────────────────────────────
export type LiveStatus = 'inactive' | 'on_leave' | 'off' | 'busy' | 'available'

export const STATUS_META: Record<LiveStatus, { label: string; dot: string; text: string; ring: string }> = {
  available: { label: 'Available',    dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
  busy:      { label: 'With patient',  dot: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
  off:       { label: 'Off today',     dot: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-400',     ring: 'ring-slate-300' },
  on_leave:  { label: 'On leave',      dot: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
  inactive:  { label: 'Inactive',      dot: 'bg-slate-300',   text: 'text-slate-400',                          ring: 'ring-slate-200' }
}

const AVATAR_COLORS = [
  '#0d9488', '#0891b2', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#2563eb', '#c026d3', '#dc2626', '#ca8a04'
]

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function colorForDoctor(d: { avatarColor?: string | null; name: string }): string {
  if (d.avatarColor) return d.avatarColor
  let hash = 0
  for (let i = 0; i < d.name.length; i++) hash = (hash * 31 + d.name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function displayName(d: { title?: string | null; name: string }): string {
  return d.title ? `${d.title} ${d.name}` : d.name
}

/**
 * Resolve which doctor should be pre-selected on a new session/appointment:
 * the patient's primary doctor → else the clinic default → else the only doctor.
 */
export function resolveDefaultDoctorId(
  doctors: Array<{ id: string; isDefault?: boolean }>,
  patientPrimaryId?: string | null
): string {
  if (patientPrimaryId && doctors.some(d => d.id === patientPrimaryId)) return patientPrimaryId
  const def = doctors.find(d => d.isDefault)
  if (def) return def.id
  if (doctors.length === 1) return doctors[0].id
  return ''
}

export const AVATAR_SWATCHES = AVATAR_COLORS
