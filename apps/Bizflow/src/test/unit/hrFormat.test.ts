/**
 * The HR formatting layer.
 *
 * These pin the two decisions the module makes deliberately, because both are the
 * kind of thing a later "cleanup" would quietly undo:
 *
 *   1. Money keeps Latin digits even in Arabic, so a figure on screen matches the
 *      figure on the receipt, the bank file and the printed payslip.
 *   2. Money that is paid is exact and never rounded; only a dashboard tile may
 *      abbreviate.
 */

import { describe, expect, it } from 'vitest'

import {
  HR_FALLBACK_CURRENCY,
  formatCount,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatTime,
  toDateInputValue,
} from '../../renderer/src/pages/Employees/ui/hrFormat'

describe('formatMoney', () => {
  it('renders an exact amount with two decimals by default', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50')
  })

  it('never rounds by default — this is money somebody is paid', () => {
    expect(formatMoney(1451.615)).toBe('$1,451.62')
    expect(formatMoney(0.005)).toBe('$0.01')
  })

  it('honours an explicit number of decimals', () => {
    expect(formatMoney(1234.5, { decimals: 0 })).toBe('$1,235')
  })

  it('uses the requested currency', () => {
    expect(formatMoney(1234.5, { currency: 'EUR' })).toBe('€1,234.50')
    expect(formatMoney(1234.5, { currency: 'AED' })).toContain('1,234.50')
  })

  it('treats null, undefined and non-numeric input as zero rather than NaN', () => {
    expect(formatMoney(null)).toBe('$0.00')
    expect(formatMoney(undefined)).toBe('$0.00')
    expect(formatMoney(Number.NaN)).toBe('$0.00')
  })

  it('formats negatives, so deductions and reversals read correctly', () => {
    expect(formatMoney(-250)).toBe('-$250.00')
  })

  it('falls back to a plain string for an unknown currency instead of throwing', () => {
    // An unrecognised code must not blank out a payslip.
    const out = formatMoney(10, { currency: 'ZZZ' })
    expect(out).toContain('ZZZ')
    expect(out).toContain('10.00')
  })

  it('defaults to the documented fallback currency', () => {
    expect(HR_FALLBACK_CURRENCY).toBe('USD')
  })
})

describe('formatMoneyCompact', () => {
  it('abbreviates thousands and millions for tiles', () => {
    expect(formatMoneyCompact(12_345)).toBe('$12.3K')
    expect(formatMoneyCompact(1_234_567)).toBe('$1.2M')
    expect(formatMoneyCompact(2_500_000_000)).toBe('$2.5B')
  })

  it('leaves small amounts unabbreviated and without cents', () => {
    expect(formatMoneyCompact(500)).toBe('$500')
    expect(formatMoneyCompact(0)).toBe('$0')
  })

  it('keeps the sign on negatives', () => {
    expect(formatMoneyCompact(-12_345)).toBe('$-12.3K')
  })
})

describe('formatDate', () => {
  it('formats an ISO date day-first', () => {
    // en-GB gives a four-letter "Sept". Day-first is deliberate: the app targets
    // a market where 09/14 reads as 14 September, so en-US ordering would be
    // actively ambiguous against locally-written dates.
    expect(formatDate('2026-09-14', 'en')).toBe('14 Sept 2026')
  })

  it('produces a different result in Arabic — dates follow the language', () => {
    expect(formatDate('2026-09-14', 'ar')).not.toBe(formatDate('2026-09-14', 'en'))
  })

  it('accepts a Date and respects explicit options', () => {
    expect(formatDate(new Date(Date.UTC(2026, 8, 14)), 'en', { day: 'numeric', month: 'long', year: 'numeric' })).toBe(
      '14 September 2026'
    )
  })

  it('returns an em dash for missing or invalid values instead of "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatTime', () => {
  it('formats a timestamp as HH:MM', () => {
    expect(formatTime('2026-09-14T14:05:00Z', 'en')).toMatch(/\d{2}:\d{2}/)
  })

  it('returns an em dash for missing values', () => {
    expect(formatTime(null)).toBe('—')
  })
})

describe('toDateInputValue', () => {
  it('produces the value an <input type="date"> expects', () => {
    expect(toDateInputValue('2026-09-14T09:30:00Z')).toBe('2026-09-14')
  })

  it('returns an empty string for missing values', () => {
    expect(toDateInputValue(null)).toBe('')
  })
})

describe('formatCount', () => {
  it('groups thousands and treats junk as zero', () => {
    expect(formatCount(12_345)).toBe('12,345')
    expect(formatCount(null)).toBe('0')
  })
})
