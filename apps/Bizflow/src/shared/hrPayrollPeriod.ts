/**
 * Payroll periods, in one place.
 *
 * History, because it explains the shape of this file: payroll records are keyed
 * by a single integer `month` plus `year`, and to fit three period types into
 * that one column the period is packed into non-overlapping integer ranges:
 *
 *   monthly →     1 – 12        (calendar month)
 *   weekly  →  1001 – 1053      (1000 + ISO week)
 *   daily   →  2101 – 3231      (2000 + month*100 + day)
 *
 * The packing works for uniqueness, but it is not a date. The main process used
 * to do `new Date(year, month - 1, 1)` on that integer, so for a weekly period
 * (1001) it looked for overtime in the year 3008 and found none — weekly and
 * daily payroll silently never picked up approved overtime. The decoder lived in
 * the renderer, which is exactly why the main process could not do better.
 *
 * So: this module lives in `shared/`, exposes the real dates of every period, and
 * is the only place that knows how the encoding works. Storage keeps `month`/`year`
 * for backward compatibility, and gains `periodStart`/`periodEnd` so queries can
 * ask date questions instead of integer ones.
 */

export type PayrollPeriodType = 'monthly' | 'weekly' | 'daily'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A resolved period: a stable key, the real dates it covers, and a label. */
export interface ResolvedPeriod {
  periodType: PayrollPeriodType
  /** Canonical, human-readable key: `2026-09`, `2026-W37`, `2026-09-14`. */
  periodKey: string
  /** First day of the period, UTC midnight (inclusive). ISO string. */
  periodStart: string
  /** Last day of the period, UTC midnight (inclusive). ISO string. */
  periodEnd: string
  label: string
}

function midnightUtc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Monday that starts ISO week `week` of `year`.
 * ISO rule: week 1 is the week containing 4 January.
 */
export function isoWeekStart(year: number, week: number): Date {
  const jan4 = midnightUtc(year, 0, 4)
  const jan4Weekday = jan4.getUTCDay() || 7 // Mon = 1 … Sun = 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Weekday - 1))

  const start = new Date(week1Monday)
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return start
}

/**
 * The integer stored in `EmployeePayroll.month`.
 * Kept exactly as it was — changing it would orphan every existing record.
 */
export function encodePayrollPeriodKey(
  periodType: PayrollPeriodType,
  month: number,
  week: number,
  day: number
): number {
  if (periodType === 'weekly') return 1000 + week
  if (periodType === 'daily') return 2000 + month * 100 + day
  return month
}

/** Human-readable label for a stored payroll `month` field. */
export function describePayrollPeriod(monthField: number, year: number): string {
  if (monthField >= 2000) {
    const m = Math.floor((monthField - 2000) / 100)
    const d = (monthField - 2000) % 100
    return `${d} ${MONTH_SHORT[m - 1] ?? '?'} ${year}`
  }
  if (monthField >= 1000) {
    return `Week ${monthField - 1000} · ${year}`
  }
  return `${MONTH_SHORT[monthField - 1] ?? '?'} ${year}`
}

/** Period type implied by a stored `month` field. */
export function periodTypeOf(monthField: number): PayrollPeriodType {
  if (monthField >= 2000) return 'daily'
  if (monthField >= 1000) return 'weekly'
  return 'monthly'
}

/** Work out which period the UI is currently showing. */
export function resolvePayrollPeriod(
  periodType: PayrollPeriodType,
  year: number,
  month: number,
  week: number,
  day: number
): ResolvedPeriod {
  if (periodType === 'weekly') {
    const start = isoWeekStart(year, week)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    return {
      periodType,
      periodKey: `${year}-W${pad(week)}`,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      label: describePayrollPeriod(1000 + week, year),
    }
  }

  if (periodType === 'daily') {
    const date = midnightUtc(year, month - 1, day)
    return {
      periodType,
      periodKey: `${year}-${pad(month)}-${pad(day)}`,
      periodStart: date.toISOString(),
      periodEnd: date.toISOString(),
      label: describePayrollPeriod(2000 + month * 100 + day, year),
    }
  }

  const start = midnightUtc(year, month - 1, 1)
  const end = midnightUtc(year, month, 0) // day 0 of next month = last day of this one
  return {
    periodType: 'monthly',
    periodKey: `${year}-${pad(month)}`,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    label: describePayrollPeriod(month, year),
  }
}

/**
 * The inverse of `encodePayrollPeriodKey`: recover the real dates of a stored
 * record. Used to migrate existing rows and to read rows written before the date
 * columns existed.
 */
export function decodePayrollPeriod(monthField: number, year: number): ResolvedPeriod {
  if (monthField >= 2000) {
    const month = Math.floor((monthField - 2000) / 100)
    const day = (monthField - 2000) % 100
    return resolvePayrollPeriod('daily', year, month, 1, day)
  }
  if (monthField >= 1000) {
    const week = monthField - 1000
    return resolvePayrollPeriod('weekly', year, 1, week, 1)
  }
  return resolvePayrollPeriod('monthly', year, Math.max(1, monthField), 1, 1)
}

/**
 * The dates a payroll record covers, preferring what is stored.
 *
 * Falls back to decoding the integer key, so a row written before the date
 * columns existed is still read correctly rather than being invisible to
 * reports.
 */
export function periodRangeOf(record: {
  month: number
  year: number
  periodStart?: string | Date | null
  periodEnd?: string | Date | null
}): { start: Date; end: Date } {
  const start = record.periodStart ? new Date(record.periodStart) : null
  const end = record.periodEnd ? new Date(record.periodEnd) : null
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    return { start, end }
  }
  const decoded = decodePayrollPeriod(record.month, record.year)
  return { start: new Date(decoded.periodStart), end: new Date(decoded.periodEnd) }
}

/** Do two inclusive date ranges share any day? */
export function periodsOverlap(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime()
}

/** The inclusive span covered by a run of calendar months, e.g. Feb–Apr 2026. */
export function calendarMonthSpan(
  startYear: number, startMonth: number,
  endYear: number, endMonth: number
): { start: Date; end: Date } {
  return {
    start: midnightUtc(startYear, startMonth - 1, 1),
    end: midnightUtc(endYear, endMonth, 0),
  }
}
