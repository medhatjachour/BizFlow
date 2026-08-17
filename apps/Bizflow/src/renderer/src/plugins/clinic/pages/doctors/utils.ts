import { SINGLE_DOCTOR_KEY, type WorkingHours } from './types'
import { AVATAR_SWATCHES } from './constants'

export function isSingleDoctorMode(): boolean {
  return localStorage.getItem(SINGLE_DOCTOR_KEY) === 'true'
}

export function setSingleDoctorMode(v: boolean): void {
  localStorage.setItem(SINGLE_DOCTOR_KEY, String(v))
}

export function parseWorkingHours(raw: string | null | undefined): WorkingHours | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    return typeof p === 'object' && p ? p : null
  } catch {
    return null
  }
}

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
  return AVATAR_SWATCHES[Math.abs(hash) % AVATAR_SWATCHES.length]
}

export function displayName(d: { title?: string | null; name: string }): string {
  return d.title ? `${d.title} ${d.name}` : d.name
}

export function formatNextAppointment(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

export function formatMoney(n: number | null | undefined): string {
  return `$${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`
}

export function resolveDefaultDoctorId(
  doctors: Array<{ id: string; isDefault?: boolean }>,
  patientPrimaryId?: string | null
): string {
  if (patientPrimaryId && doctors.some((d) => d.id === patientPrimaryId)) return patientPrimaryId
  const def = doctors.find((d) => d.isDefault)
  if (def) return def.id
  if (doctors.length === 1) return doctors[0].id
  return ''
}