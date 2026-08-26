import { APPT_TYPES } from './constants'

export function toIsoDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shiftDateDays(anchorDate: string, days: number): string {
  const d = new Date(anchorDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toIsoDateString(d)
}

export function getWeekDatesList(anchorDate: string): string[] {
  const d = new Date(anchorDate + 'T00:00:00')
  const dow = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dow + 6) % 7))

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return toIsoDateString(day)
  })
}

export function formatApptTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function formatApptDateFull(iso: string | undefined | null, locale = 'en'): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

export function getApptTypeLabel(type: string, locale = 'en'): string {
  const item = APPT_TYPES.find((t) => t.value === type)
  if (item) return locale === 'ar' ? item.labelAr : item.labelEn
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildSlotSchedule(stepMinutes: number): string[] {
  const slots: string[] = []
  for (let h = 8; h <= 21; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      if (h === 21 && m > 0) break
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}