/**
 * Payroll period encoding.
 *
 * Payroll records are keyed by a single integer `month` field + `year`
 * (unique per employee). To support monthly / weekly / daily periods without a
 * schema change we pack the period into non-overlapping integer ranges so the
 * three period types can never collide with each other:
 *
 *   monthly →  1 – 12                (calendar month)
 *   weekly  →  1001 – 1053           (1000 + ISO week number)
 *   daily   →  2101 – 3231           (2000 + calendarMonth*100 + dayOfMonth)
 *
 * Previously all three shared the 1–53 range, so e.g. "day 5 of July" and
 * "day 5 of August" (or "week 5" and "month 5") overwrote each other.
 */

export type PayrollPeriodType = 'monthly' | 'weekly' | 'daily'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Encode the active UI period into the integer stored in `EmployeePayroll.month`. */
export function encodePayrollPeriodKey(
  periodType: PayrollPeriodType,
  month: number,
  week: number,
  day: number,
): number {
  if (periodType === 'weekly') return 1000 + week
  if (periodType === 'daily') return 2000 + month * 100 + day
  return month
}

/** Human-readable label for a stored payroll `month` field. Robust to all three encodings. */
export function describePayrollPeriod(monthField: number, year: number): string {
  if (monthField >= 2000) {
    const m = Math.floor((monthField - 2000) / 100)
    const d = (monthField - 2000) % 100
    const name = MONTH_SHORT[m - 1] ?? '?'
    return `${d} ${name} ${year}`
  }
  if (monthField >= 1000) {
    return `Week ${monthField - 1000} · ${year}`
  }
  return `${MONTH_SHORT[monthField - 1] ?? '?'} ${year}`
}
