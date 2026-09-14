import { describe, it, expect } from 'vitest'

import {
  DEFAULT_OFFBOARDING_TASKS,
  DEFAULT_ONBOARDING_TASKS,
  computeSettlement,
  dailyRateFor,
  monthlyRateFor,
} from '../../shared/hrSettlement'

/**
 * Final settlement is the last thing an employer owes somebody, so the maths is
 * pinned down here rather than trusted. The date fixtures use April (30 days) so
 * the proration assertions are exact and not at the mercy of month lengths.
 */

const base = {
  salary: 3000,
  salaryType: 'monthly',
  hireDate: '2020-04-01',
  lastWorkingDate: '2026-04-15',
  leaveRemainingDays: 0,
  includeGratuity: false,
}

describe('monthlyRateFor', () => {
  it('expresses every pay basis as a monthly figure', () => {
    expect(monthlyRateFor(3000, 'monthly')).toBe(3000)
    expect(monthlyRateFor(400, 'weekly')).toBeCloseTo((400 * 52) / 12, 6)
    expect(monthlyRateFor(100, 'daily')).toBe(3000)
    expect(monthlyRateFor(10, 'hourly')).toBe(1600)
  })

  it('treats an unknown basis as monthly and never returns a negative', () => {
    expect(monthlyRateFor(1000, 'fortnightly')).toBe(1000)
    expect(monthlyRateFor(-50, 'monthly')).toBe(0)
  })
})

describe('dailyRateFor', () => {
  it('derives the day rate from the monthly figure', () => {
    expect(dailyRateFor(3000, 'monthly')).toBe(100)
    // 400 a week → 1733.33 a month → 57.78 a day
    expect(dailyRateFor(400, 'weekly')).toBeCloseTo(57.78, 2)
  })
})

describe('computeSettlement', () => {
  it('pays only the days worked in the final month', () => {
    const result = computeSettlement(base)
    // 3000 / 30 days × 15 days = 1500
    expect(result.proratedDays).toBe(15)
    expect(result.daysInFinalMonth).toBe(30)
    expect(result.lines.find((l) => l.label === 'salaryForDaysWorked')?.amount).toBe(1500)
    expect(result.total).toBe(1500)
  })

  it('encashes the leave days still owed', () => {
    const result = computeSettlement({ ...base, leaveRemainingDays: 5 })
    // 5 days × 100/day
    expect(result.lines.find((l) => l.label === 'leaveEncashment')?.amount).toBe(500)
    expect(result.total).toBe(2000)
  })

  it('counts completed years of service for the benefit', () => {
    const result = computeSettlement({ ...base, includeGratuity: true })
    expect(result.completedYears).toBe(6)
    // 6 years × 1 month × 3000
    expect(result.lines.find((l) => l.label === 'endOfService')?.amount).toBe(18000)
  })

  it('honours a different gratuity basis, because it is a business convention', () => {
    const half = computeSettlement({ ...base, includeGratuity: true, gratuityMonthsPerYear: 0.5 })
    expect(half.lines.find((l) => l.label === 'endOfService')?.amount).toBe(9000)
  })

  it('omits the benefit entirely when switched off', () => {
    const result = computeSettlement({ ...base, includeGratuity: true, gratuityMonthsPerYear: 0 })
    expect(result.lines.some((l) => l.label === 'endOfService')).toBe(false)
    expect(result.total).toBe(1500)
  })

  it('does not credit a benefit before a full year is served', () => {
    const result = computeSettlement({
      ...base,
      hireDate: '2026-01-01',
      includeGratuity: true,
    })
    expect(result.completedYears).toBe(0)
    expect(result.total).toBe(1500)
  })

  it('adds approved overtime, because it is already earned', () => {
    const result = computeSettlement({ ...base, overtimePay: 275.5, overtimeHours: 12 })
    expect(result.lines.find((l) => l.label === 'overtime')?.amount).toBe(275.5)
    expect(result.total).toBe(1775.5)
  })

  it('adds other amounts owing and subtracts recoveries', () => {
    const result = computeSettlement({ ...base, additions: 200, deductions: 350 })
    expect(result.lines.find((l) => l.label === 'otherAdditions')?.amount).toBe(200)
    expect(result.lines.find((l) => l.label === 'deductions')?.amount).toBe(-350)
    expect(result.total).toBe(1350)
    expect(result.deductions).toBe(350)
  })

  it('never pays a negative total, even when recoveries exceed what is owed', () => {
    const result = computeSettlement({ ...base, deductions: 99999 })
    expect(result.total).toBe(0)
  })

  it('prices an hourly employee from their rate, not a monthly guess', () => {
    const result = computeSettlement({
      ...base,
      salary: 10,
      salaryType: 'hourly',
      leaveRemainingDays: 0,
    })
    // 10/hr → 1600/month → 53.33/day; 15 of 30 days
    expect(result.monthlyRate).toBe(1600)
    expect(result.total).toBe(800)
  })

  it('ignores nonsense numbers instead of producing NaN', () => {
    const result = computeSettlement({
      ...base,
      salary: Number.NaN,
      leaveRemainingDays: Number.NaN,
      additions: Number.NaN,
      deductions: Number.NaN,
    })
    expect(result.total).toBe(0)
    expect(Number.isNaN(result.total)).toBe(false)
  })
})

describe('default checklists', () => {
  it('blocks offboarding on access and equipment, which is the point of the list', () => {
    const required = DEFAULT_OFFBOARDING_TASKS.filter((task) => task.required).map((t) => t.title)
    expect(required.some((title) => /access/i.test(title))).toBe(true)
    expect(required.some((title) => /laptop/i.test(title))).toBe(true)
    expect(required.some((title) => /settlement/i.test(title))).toBe(true)
  })

  it('treats the payroll-blocking onboarding items as required', () => {
    const required = DEFAULT_ONBOARDING_TASKS.filter((task) => task.required).map((t) => t.title)
    expect(required.some((title) => /bank/i.test(title))).toBe(true)
    expect(required.some((title) => /tax/i.test(title))).toBe(true)
    expect(required.some((title) => /insurance/i.test(title))).toBe(true)
  })

  it('keeps optional niceties optional', () => {
    const exitInterview = DEFAULT_OFFBOARDING_TASKS.find((task) => /exit interview/i.test(task.title))
    expect(exitInterview?.required).toBe(false)
  })
})
