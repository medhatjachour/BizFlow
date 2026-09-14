/**
 * Shift time arithmetic, kept out of the component so it can be tested.
 *
 * The rules here are the ones the UI was previously guessing at:
 *  - a shift may legitimately cross midnight (22:00 → 06:00 is a night shift, not
 *    a negative duration),
 *  - an unpaid break is subtracted from the scheduled length,
 *  - two shifts may not overlap, including when one of them runs past midnight.
 *
 * Every function is pure and returns numbers, never formatted strings — the
 * active language decides how the numbers are shown.
 */

/** `HH:MM` (or `HH:MM:SS`) → minutes from midnight. Returns null for junk input. */
export function timeToMinutes(time?: string | null): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * End of a shift in minutes from the start of its own day, so a shift that runs
 * past midnight reports a value above 1440 instead of wrapping to a negative.
 *
 * Identical start and end reads as a zero-length entry rather than a 24-hour
 * shift: nothing in this app schedules a full-day shift, and treating it as 24
 * hours silently inflates somebody's pay.
 */
export function shiftEndMinutes(start?: string | null, end?: string | null): number | null {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s === null || e === null) return null
  return e < s ? e + 24 * 60 : e
}

/** Paid minutes for one shift. Zero when the times are unusable or the break eats the shift. */
export function shiftDurationMinutes(start?: string | null, end?: string | null, breakMins = 0): number {
  const s = timeToMinutes(start)
  const e = shiftEndMinutes(start, end)
  if (s === null || e === null) return 0
  const paid = e - s - (Number.isFinite(breakMins) ? Math.max(0, breakMins) : 0)
  return paid > 0 ? paid : 0
}

/** Calendar day of a shift, as `YYYY-MM-DD` in local time. Stable for date comparisons. */
export function shiftDay(shift: { date: string }): string {
  const d = new Date(shift.date)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface ShiftLike {
  id: string
  date: string
  startTime: string
  endTime: string
  breakMins?: number
}

/**
 * A shift as an absolute minute range so that two shifts can be compared even
 * when one of them crosses midnight.
 *
 * Comparing bare `HH:MM` values would miss the real clash between a Monday
 * 22:00 → 06:00 night shift and a Tuesday 05:00 handover, which is the overlap
 * that actually costs a business money. Anchoring both ends to the shift's own
 * calendar day fixes that.
 */
function shiftAbsoluteRange(shift: ShiftLike): { start: number; end: number } | null {
  const day = shiftDay(shift)
  if (day === '') return null
  const [y, m, d] = day.split('-').map(Number)
  const base = Math.round(new Date(y, m - 1, d).getTime() / 60_000)
  const start = timeToMinutes(shift.startTime)
  const end = shiftEndMinutes(shift.startTime, shift.endTime)
  if (start === null || end === null) return null
  return { start: base + start, end: base + end }
}

function overlaps(a: ShiftLike, b: ShiftLike): boolean {
  const ra = shiftAbsoluteRange(a)
  const rb = shiftAbsoluteRange(b)
  if (!ra || !rb) return false
  return ra.start < rb.end && rb.start < ra.end
}

/**
 * Ids of every shift that clashes with another one.
 *
 * Both sides of a clash are flagged, because from the user's point of view
 * either row might be the mistake.
 */
export function overlappingShiftIds(shifts: ShiftLike[]): Set<string> {
  const flagged = new Set<string>()
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      if (overlaps(shifts[i], shifts[j])) {
        flagged.add(shifts[i].id)
        flagged.add(shifts[j].id)
      }
    }
  }
  return flagged
}

/** Total paid minutes across a set of shifts, for the "scheduled hours" figure. */
export function totalShiftMinutes(shifts: ShiftLike[]): number {
  return shifts.reduce((sum, s) => sum + shiftDurationMinutes(s.startTime, s.endTime, s.breakMins ?? 0), 0)
}

/** Shifts whose day falls in `[from, to]`, both inclusive `YYYY-MM-DD` strings. */
export function shiftsBetween<T extends ShiftLike>(shifts: T[], from: string, to: string): T[] {
  return shifts.filter((s) => {
    const day = shiftDay(s)
    return day !== '' && day >= from && day <= to
  })
}

/** `YYYY-MM-DD` for `days` from today, in local time. */
export function localDayOffset(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Whole minutes between two timestamps, for a recorded attendance day.
 *
 * Returns 0 when either side is missing or the pair runs backwards, so a
 * forgotten check-out contributes nothing rather than a negative day.
 */
export function minutesBetween(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  const from = new Date(start).getTime()
  const to = new Date(end).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  const diff = to - from
  return diff > 0 ? Math.round(diff / 60_000) : 0
}

/**
 * The calendar day a stored date belongs to, as `YYYY-MM-DD`.
 *
 * Date columns arrive as UTC midnight, so the leading date part of the value
 * *is* the day that was picked. Deriving it through the machine's timezone
 * instead — which `new Date(value).toISOString().split('T')[0]` does — moved
 * every record a day earlier for anyone east of UTC, i.e. the whole
 * Arabic-default audience this module is built for.
 */
export function calendarDay(value: string | Date | null | undefined): string {
  if (!value) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match ? match[1] : ''
}
