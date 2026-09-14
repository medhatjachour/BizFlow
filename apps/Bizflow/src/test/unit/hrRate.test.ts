/**
 * The rate rule used to exist in three places that disagreed. These tests pin the
 * behaviour so a fourth copy — or a well-meaning simplification of this one —
 * fails loudly instead of quietly paying somebody the wrong amount.
 */

import { describe, expect, it } from 'vitest'

import {
  hourlyRateFor,
  overtimePayFor,
  salaryPeriodSuffix,
  standardHoursFor,
} from '../../shared/hrRate'

describe('standardHoursFor', () => {
  it('spreads a monthly salary over 160 hours', () => {
    expect(standardHoursFor('monthly')).toBe(160)
  })

  it('spreads a weekly salary over 40 hours', () => {
    expect(standardHoursFor('weekly')).toBe(40)
  })

  it('spreads a daily rate over 8 hours', () => {
    expect(standardHoursFor('daily')).toBe(8)
  })

  it('treats an hourly wage as the rate itself', () => {
    expect(standardHoursFor('hourly')).toBe(1)
  })

  it('normalises casing, which the renderer previously did not', () => {
    expect(standardHoursFor('Daily')).toBe(8)
    expect(standardHoursFor('MONTHLY')).toBe(160)
  })

  it('falls back to 160 rather than turning an unknown type into an hourly rate', () => {
    expect(standardHoursFor('sabbatical')).toBe(160)
  })
})

describe('hourlyRateFor', () => {
  it('pays a daily worker 1/8 of their day rate', () => {
    // The regression: the profile modal divided daily staff by 160, showing
    // $0.75/hr for a $120/day worker whose real rate is $15/hr — a 20× error.
    expect(hourlyRateFor(120, 'daily')).toBe(15)
  })

  it('does not confuse daily with monthly', () => {
    expect(hourlyRateFor(120, 'daily')).not.toBe(hourlyRateFor(120, 'monthly'))
    expect(hourlyRateFor(120, 'monthly')).toBeCloseTo(0.75, 5)
  })

  it('returns the wage unchanged for hourly staff', () => {
    expect(hourlyRateFor(22.5, 'hourly')).toBe(22.5)
  })

  it('returns 0 for a missing or non-positive salary instead of NaN or Infinity', () => {
    expect(hourlyRateFor(0, 'monthly')).toBe(0)
    expect(hourlyRateFor(null, 'monthly')).toBe(0)
    expect(hourlyRateFor(undefined, 'daily')).toBe(0)
    expect(hourlyRateFor(-100, 'weekly')).toBe(0)
  })
})

describe('overtimePayFor', () => {
  it('multiplies rate by hours by the contract uplift', () => {
    // 120/day → 15/hr, 4 hours at 1.5× = 90
    expect(overtimePayFor(120, 'daily', 4, 1.5)).toBe(90)
  })

  it('applies no premium when no multiplier is supplied', () => {
    expect(overtimePayFor(160, 'daily', 2)).toBe(40)
  })

  it('clamps the multiplier to 1 rather than producing NaN', () => {
    expect(overtimePayFor(160, 'daily', 2, Number.NaN)).toBe(40)
  })

  it('returns 0 for zero or invalid hours', () => {
    expect(overtimePayFor(160, 'daily', 0, 1.5)).toBe(0)
    expect(overtimePayFor(160, 'daily', Number.NaN, 1.5)).toBe(0)
  })
})

describe('salaryPeriodSuffix', () => {
  it('labels each pay basis', () => {
    expect(salaryPeriodSuffix('hourly')).toBe('hr')
    expect(salaryPeriodSuffix('daily')).toBe('day')
    expect(salaryPeriodSuffix('weekly')).toBe('wk')
    expect(salaryPeriodSuffix('monthly')).toBe('mo')
  })
})
