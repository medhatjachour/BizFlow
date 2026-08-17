/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function toIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Shifts ISO Date string by delta days
 */
export function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toIsoDate(d)
}

/**
 * Returns the 7 ISO dates for the week containing anchorDate (Mon-Sun)
 */
export function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate + 'T00:00:00')
  const dow = d.getDay() // 0 = Sun
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return toIsoDate(day)
  })
}

/**
 * Calculates day difference between target date and today (0 = today, < 0 overdue, > 0 upcoming)
 */
export function daysDiff(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Timezone-safe conversion to local "YYYY-MM-DDTHH:MM" format
 */
export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${day}T${h}:${mi}`
  } catch {
    return ''
  }
}

/**
 * Generates discrete time slots from 07:00 to 23:30 based on duration in minutes
 */
export function buildTimeSlots(durationMins: number): string[] {
  const slots: string[] = []
  const startMins = 7 * 60
  const endMins = 23 * 60 + 30
  for (let total = startMins; total <= endMins; total += durationMins) {
    const h = Math.floor(total / 60)
    const m = total % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

/**
 * Normalizes paginated or array payloads into typed array
 */
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}