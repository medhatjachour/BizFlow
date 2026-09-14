import { describe, it, expect } from 'vitest'

import {
  calendarMonthSpan,
  decodePayrollPeriod,
  describePayrollPeriod,
  encodePayrollPeriodKey,
  isoWeekStart,
  periodRangeOf,
  periodTypeOf,
  periodsOverlap,
  resolvePayrollPeriod,
} from '../../shared/hrPayrollPeriod'

/**
 * The packed period key is the reason this module exists: it is an integer that
 * looks like a month but is not one. The main process used to do
 * `new Date(year, month - 1, 1)` on it, so a weekly period (key 1001) searched for
 * overtime in the year 3008 — weekly and daily staff were silently never paid
 * their overtime. These tests pin the decode down so that cannot come back.
 */

describe('encoding', () => {
  it('keeps the three period types in separate ranges', () => {
    expect(encodePayrollPeriodKey('monthly', 9, 1, 1)).toBe(9)
    expect(encodePayrollPeriodKey('weekly', 1, 37, 1)).toBe(1037)
    expect(encodePayrollPeriodKey('daily', 9, 1, 14)).toBe(2914)
  })

  it('reports the period type from a stored key', () => {
    expect(periodTypeOf(9)).toBe('monthly')
    expect(periodTypeOf(1037)).toBe('weekly')
    expect(periodTypeOf(2914)).toBe('daily')
  })

  it('labels each encoding, and survives a nonsense one', () => {
    expect(describePayrollPeriod(9, 2026)).toBe('Sep 2026')
    expect(describePayrollPeriod(1037, 2026)).toBe('Week 37 · 2026')
    expect(describePayrollPeriod(2914, 2026)).toBe('14 Sep 2026')
    expect(describePayrollPeriod(99, 2026)).toBe('? 2026')
  })
})

describe('resolvePayrollPeriod', () => {
  it('gives a calendar month its real first and last day', () => {
    const period = resolvePayrollPeriod('monthly', 2026, 2, 1, 1)
    expect(period.periodStart).toBe('2026-02-01T00:00:00.000Z')
    // 2026 is not a leap year — February ends on the 28th.
    expect(period.periodEnd).toBe('2026-02-28T00:00:00.000Z')
    expect(period.periodKey).toBe('2026-02')
  })

  it('handles a leap February', () => {
    const period = resolvePayrollPeriod('monthly', 2028, 2, 1, 1)
    expect(period.periodEnd).toBe('2028-02-29T00:00:00.000Z')
  })

  it('gives a week seven days, Monday to Sunday', () => {
    const period = resolvePayrollPeriod('weekly', 2026, 1, 37, 1)
    const start = new Date(period.periodStart)
    const end = new Date(period.periodEnd)
    expect(start.getUTCDay()).toBe(1) // Monday
    expect(end.getUTCDay()).toBe(0) // Sunday
    expect((end.getTime() - start.getTime()) / 86400000).toBe(6)
    expect(period.periodKey).toBe('2026-W37')
  })

  it('gives a day exactly that day', () => {
    const period = resolvePayrollPeriod('daily', 2026, 9, 1, 14)
    expect(period.periodStart).toBe('2026-09-14T00:00:00.000Z')
    expect(period.periodEnd).toBe('2026-09-14T00:00:00.000Z')
    expect(period.periodKey).toBe('2026-09-14')
  })

  it('starts ISO week 1 on the week containing 4 January', () => {
    // 2026-01-04 is a Sunday, so ISO week 1 starts Monday 2025-12-29.
    expect(isoWeekStart(2026, 1).toISOString()).toBe('2025-12-29T00:00:00.000Z')
    expect(isoWeekStart(2026, 2).toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  it('labels a week the way the UI shows it', () => {
    expect(resolvePayrollPeriod('weekly', 2026, 1, 37, 1).label).toBe('Week 37 · 2026')
  })
})

describe('decodePayrollPeriod', () => {
  it('round-trips every monthly key', () => {
    for (let month = 1; month <= 12; month++) {
      const encoded = encodePayrollPeriodKey('monthly', month, 1, 1)
      const decoded = decodePayrollPeriod(encoded, 2026)
      expect(decoded.periodType).toBe('monthly')
      expect(new Date(decoded.periodStart).getUTCMonth() + 1).toBe(month)
      expect(decoded.periodKey).toBe(`2026-${String(month).padStart(2, '0')}`)
    }
  })

  it('round-trips every week of the year to a real week', () => {
    for (let week = 1; week <= 52; week++) {
      const decoded = decodePayrollPeriod(1000 + week, 2026)
      const start = new Date(decoded.periodStart)
      expect(decoded.periodType).toBe('weekly')
      // Never the wild future date the old month arithmetic produced.
      expect(start.getUTCFullYear()).toBeGreaterThanOrEqual(2025)
      expect(start.getUTCFullYear()).toBeLessThanOrEqual(2027)
      expect(start.getUTCDay()).toBe(1)
    }
  })

  it('round-trips a daily key to its own day', () => {
    const decoded = decodePayrollPeriod(2000 + 9 * 100 + 14, 2026)
    expect(decoded.periodType).toBe('daily')
    expect(decoded.periodStart).toBe('2026-09-14T00:00:00.000Z')
  })

  it('never produces an invalid date, for any key it is handed', () => {
    for (const key of [0, 1, 12, 13, 1001, 1053, 2101, 2914, 3231, 9999]) {
      const decoded = decodePayrollPeriod(key, 2026)
      expect(Number.isNaN(new Date(decoded.periodStart).getTime())).toBe(false)
      expect(Number.isNaN(new Date(decoded.periodEnd).getTime())).toBe(false)
    }
  })
})

describe('periodRangeOf', () => {
  it('prefers stored dates', () => {
    const range = periodRangeOf({
      month: 9,
      year: 2026,
      periodStart: '2026-09-08T00:00:00.000Z',
      periodEnd: '2026-09-14T00:00:00.000Z',
    })
    expect(range.start.toISOString()).toBe('2026-09-08T00:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-09-14T00:00:00.000Z')
  })

  it('falls back to decoding the key for a row written before the columns existed', () => {
    const range = periodRangeOf({ month: 1037, year: 2026, periodStart: null, periodEnd: null })
    expect(range.start.toISOString()).toBe(resolvePayrollPeriod('weekly', 2026, 1, 37, 1).periodStart)
    expect(range.start.getUTCDay()).toBe(1)
  })

  it('ignores unparseable stored dates rather than returning an invalid range', () => {
    const range = periodRangeOf({
      month: 9,
      year: 2026,
      periodStart: 'not-a-date',
      periodEnd: 'also-not-a-date',
    })
    expect(Number.isNaN(range.start.getTime())).toBe(false)
    expect(range.start.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })
})

describe('periodsOverlap', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

  it('is true for ranges that share any day', () => {
    expect(periodsOverlap(day('2026-09-01'), day('2026-09-30'), day('2026-09-14'), day('2026-09-14'))).toBe(true)
    expect(periodsOverlap(day('2026-08-31'), day('2026-09-06'), day('2026-09-01'), day('2026-09-30'))).toBe(true)
  })

  it('is false for ranges that touch but do not overlap', () => {
    expect(periodsOverlap(day('2026-09-01'), day('2026-09-30'), day('2026-10-01'), day('2026-10-31'))).toBe(false)
  })

  it('counts the boundary day as shared', () => {
    expect(periodsOverlap(day('2026-09-01'), day('2026-09-30'), day('2026-09-30'), day('2026-10-31'))).toBe(true)
  })
})

describe('calendarMonthSpan', () => {
  it('covers the first day of the first month to the last day of the last', () => {
    const span = calendarMonthSpan(2026, 2, 2026, 4)
    expect(span.start.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(span.end.toISOString()).toBe('2026-04-30T00:00:00.000Z')
  })

  it('handles a span that crosses a year boundary', () => {
    const span = calendarMonthSpan(2025, 11, 2026, 2)
    expect(span.start.toISOString()).toBe('2025-11-01T00:00:00.000Z')
    expect(span.end.toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  it('catches a weekly period that straddles two months — the regression', () => {
    // A week running 31 Aug – 6 Sep must appear in an August AND a September report.
    const week = resolvePayrollPeriod('weekly', 2026, 1, 36, 1)
    const weekRange = { start: new Date(week.periodStart), end: new Date(week.periodEnd) }
    const august = calendarMonthSpan(2026, 8, 2026, 8)
    const september = calendarMonthSpan(2026, 9, 2026, 9)
    expect(periodsOverlap(weekRange.start, weekRange.end, august.start, august.end)).toBe(true)
    expect(periodsOverlap(weekRange.start, weekRange.end, september.start, september.end)).toBe(true)
  })

  it('excludes a daily period outside the reported months — the old key filter missed these', () => {
    const daily = resolvePayrollPeriod('daily', 2026, 9, 1, 14)
    const dailyRange = { start: new Date(daily.periodStart), end: new Date(daily.periodEnd) }
    const july = calendarMonthSpan(2026, 7, 2026, 7)
    expect(periodsOverlap(dailyRange.start, dailyRange.end, july.start, july.end)).toBe(false)
    // Its packed key is 2914, which is why `month BETWEEN 1 AND 12` dropped it.
    expect(encodePayrollPeriodKey('daily', 9, 1, 14)).toBeGreaterThan(12)
  })
})
