import { describe, it, expect } from 'vitest'

import {
  computeOvertimePay,
  standardHoursFor,
  type AddForm,
} from '../../../renderer/src/pages/Employees/components/PayrollOverview'
import type { Employee } from '../../../renderer/src/pages/Employees/types'

/**
 * Overtime pricing is the one piece of this module where a silent regression
 * costs somebody money. It used to be computed two different ways — the modal
 * respected the salary type, the main process always divided by 160 — so hourly
 * staff were shown one figure and paid another.
 *
 * These cases pin the rate basis down: monthly over 160h, weekly over 40h, daily
 * over 8h, and hourly at face value.
 */

function employee(salary: number, salaryType: string): Employee {
  return {
    id: 'e1',
    name: 'Test',
    role: 'Staff',
    phone: '000',
    employmentType: 'full-time',
    status: 'active',
    hireDate: '2024-01-01',
    salary,
    salaryType,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }
}

function form(overrides: Partial<AddForm> = {}): AddForm {
  return {
    baseSalary: 0,
    bonuses: 0,
    deductions: 0,
    overtimeHours: 0,
    overtimeMultiplier: 1.5,
    daysWorked: 0,
    notes: '',
    ...overrides,
  }
}

describe('standardHoursFor', () => {
  it('spreads each pay basis over its own standard hours', () => {
    expect(standardHoursFor('monthly')).toBe(160)
    expect(standardHoursFor('weekly')).toBe(40)
    expect(standardHoursFor('daily')).toBe(8)
    expect(standardHoursFor('hourly')).toBe(1)
  })

  it('treats an unknown or missing salary type as monthly', () => {
    expect(standardHoursFor('')).toBe(160)
    expect(standardHoursFor('something-else')).toBe(160)
  })
})

describe('computeOvertimePay', () => {
  it('pays a monthly employee at salary/160 per hour, times the multiplier', () => {
    // 1600 / 160 = 10 per hour; 10 hours at 1.5x = 150
    const pay = computeOvertimePay(employee(1600, 'monthly'), form({ overtimeHours: 10 }))
    expect(pay).toBeCloseTo(150, 5)
  })

  it('pays a weekly employee over 40 hours', () => {
    // 400 / 40 = 10 per hour; 4 hours at 1.5x = 60
    const pay = computeOvertimePay(employee(400, 'weekly'), form({ overtimeHours: 4 }))
    expect(pay).toBeCloseTo(60, 5)
  })

  it('pays a daily employee over 8 hours', () => {
    // 80 / 8 = 10 per hour; 3 hours at 2x = 60
    const pay = computeOvertimePay(
      employee(80, 'daily'),
      form({ overtimeHours: 3, overtimeMultiplier: 2 })
    )
    expect(pay).toBeCloseTo(60, 5)
  })

  it('pays an hourly employee their rate, not the rate divided by 160', () => {
    // The regression this guards: 10 per hour, 8 hours at 1.5x = 120.
    // Dividing by 160 first would give 0.75.
    const pay = computeOvertimePay(employee(10, 'hourly'), form({ overtimeHours: 8 }))
    expect(pay).toBeCloseTo(120, 5)
  })

  it('is unaffected by the base pay entered for the period', () => {
    // The period amount belongs to the period; the rate comes from the employee
    // record. Conflating the two is what made hourly overtime nonsense.
    const withPeriodAmount = computeOvertimePay(
      employee(10, 'hourly'),
      form({ overtimeHours: 8, baseSalary: 1760 })
    )
    expect(withPeriodAmount).toBeCloseTo(120, 5)
  })

  it('returns zero when no overtime was worked', () => {
    expect(computeOvertimePay(employee(1600, 'monthly'), form())).toBe(0)
  })

  it('returns zero rather than NaN for an employee with no salary', () => {
    expect(computeOvertimePay(employee(0, 'monthly'), form({ overtimeHours: 5 }))).toBe(0)
  })
})
