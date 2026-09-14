/**
 * Final settlement (end-of-service) maths.
 *
 * Lives in `shared/` on purpose: the main process computes the authoritative
 * figure and the modal shows a live preview, and the two must never disagree.
 * That lesson was already learned the hard way once in this module — overtime
 * was priced two different ways and hourly staff were quoted one number and paid
 * another.
 *
 * IMPORTANT: the end-of-service benefit below is a *business convention*, not
 * legal advice. Statutory formulas differ by country and by contract (UAE uses
 * 21 days' basic per year for the first five years then 30; Egypt, Saudi and
 * Jordan all differ again). `gratuityMonthsPerYear` and `includeGratuity` exist
 * so a business can set its own basis, and whatever the software computes is
 * meant to be confirmed by a human before anything is paid.
 */

export type SettlementSalaryType = 'monthly' | 'weekly' | 'daily' | 'hourly'

export interface SettlementInput {
  salary: number
  salaryType: string
  hireDate: string
  lastWorkingDate: string
  /** Annual leave days still owed (allowance − approved days taken). */
  leaveRemainingDays: number
  /** Months of basic pay per completed year of service. Default 1. */
  gratuityMonthsPerYear?: number
  /** Set false when the business pays no end-of-service benefit. */
  includeGratuity?: boolean
  /** One-off amounts still owed: unpaid expenses, agreed bonus. */
  additions?: number
  /** Recoveries: outstanding advances, unreturned equipment. */
  deductions?: number
  /** Approved overtime for the final month — already worked, so already owed. */
  overtimePay?: number
  /** Pay credited for extra shifts worked in the final month. */
  overtimeHours?: number
  extraShiftPay?: number
}

export interface SettlementLine {
  label: string
  amount: number
}

export interface SettlementBreakdown {
  /** Pay per day, derived from the salary basis. */
  dailyRate: number
  /** Salary expressed per month, so mixed bases can be added up. */
  monthlyRate: number
  /** Completed years of service at the last working date. */
  completedYears: number
  /** Calendar days worked in the final month. */
  proratedDays: number
  /** Days in the final calendar month. */
  daysInFinalMonth: number
  lines: SettlementLine[]
  grossTotal: number
  deductions: number
  /** What the employee should receive. */
  total: number
}

const DEFAULT_GRATUITY_MONTHS_PER_YEAR = 1

/** Hours a month is treated as, for hourly-paid staff. Matches overtime pricing. */
const STANDARD_MONTHLY_HOURS = 160
/** Days a month is treated as, for daily-rate conversions. */
const STANDARD_MONTH_DAYS = 30

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Salary expressed as a monthly figure, whatever basis the employee is on. */
export function monthlyRateFor(salary: number, salaryType: string): number {
  if (!isFiniteNumber(salary) || salary <= 0) return 0
  switch (String(salaryType).toLowerCase()) {
    case 'hourly': return salary * STANDARD_MONTHLY_HOURS
    case 'daily':  return salary * STANDARD_MONTH_DAYS
    case 'weekly': return (salary * 52) / 12
    default:       return salary
  }
}

/** Pay per calendar day, from the same basis. */
export function dailyRateFor(salary: number, salaryType: string): number {
  return monthlyRateFor(salary, salaryType) / STANDARD_MONTH_DAYS
}

/**
 * Final settlement for an employee.
 *
 * Proration is by calendar day within the final month, which is what most small
 * businesses actually pay: someone whose last day is the 14th is owed 14/30ths.
 * Anything more exotic (working-day proration, unpaid absence offsets) belongs in
 * the payroll record, not here — and the caller can always override the amounts
 * before the payslip is created.
 */
export function computeSettlement(input: SettlementInput): SettlementBreakdown {
  const salary = isFiniteNumber(input.salary) ? input.salary : 0
  const monthlyRate = monthlyRateFor(salary, input.salaryType)
  const dailyRate = dailyRateFor(salary, input.salaryType)

  const lastDay = toDate(input.lastWorkingDate)
  const hireDay = toDate(input.hireDate)

  const daysInFinalMonth = lastDay
    ? new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, 0).getDate()
    : STANDARD_MONTH_DAYS
  const proratedDays = lastDay ? lastDay.getDate() : 0

  const proratedSalary = round2((monthlyRate / daysInFinalMonth) * proratedDays)

  const leaveDays = isFiniteNumber(input.leaveRemainingDays) ? Math.max(0, input.leaveRemainingDays) : 0
  const leaveEncashment = round2(leaveDays * dailyRate)

  let completedYears = 0
  if (lastDay && hireDay && lastDay.getTime() > hireDay.getTime()) {
    const ms = lastDay.getTime() - hireDay.getTime()
    completedYears = Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
  }

  const includeGratuity = input.includeGratuity !== false
  const gratuityMonthsPerYear = isFiniteNumber(input.gratuityMonthsPerYear)
    ? Math.max(0, input.gratuityMonthsPerYear)
    : DEFAULT_GRATUITY_MONTHS_PER_YEAR
  const gratuity = includeGratuity
    ? round2(completedYears * monthlyRate * gratuityMonthsPerYear)
    : 0

  const additions = isFiniteNumber(input.additions) ? input.additions : 0
  const deductions = isFiniteNumber(input.deductions) ? Math.max(0, input.deductions) : 0
  const overtimePay = isFiniteNumber(input.overtimePay) ? Math.max(0, input.overtimePay) : 0
  const extraShiftPay = isFiniteNumber(input.extraShiftPay) ? Math.max(0, input.extraShiftPay) : 0

  const lines: SettlementLine[] = [
    {
      label: 'salaryForDaysWorked',
      amount: proratedSalary,
    },
  ]

  // Overtime already worked is already earned — leaving it out would quietly
  // underpay the final month.
  if (overtimePay > 0) {
    lines.push({ label: 'overtime', amount: round2(overtimePay) })
  }
  if (extraShiftPay > 0) {
    lines.push({ label: 'extraShifts', amount: round2(extraShiftPay) })
  }

  lines.push({
    label: 'leaveEncashment',
    amount: leaveEncashment,
  })

  // Only show the benefit when it is actually owed. A "0.00" line reads as a
  // considered entitlement of nothing, which is more confusing than absent —
  // the screen already shows the basis it was calculated from.
  if (gratuity > 0) {
    lines.push({ label: 'endOfService', amount: gratuity })
  }
  if (additions > 0) {
    lines.push({ label: 'otherAdditions', amount: round2(additions) })
  }
  if (deductions > 0) {
    lines.push({ label: 'deductions', amount: -round2(deductions) })
  }

  const grossTotal = round2(
    lines.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0)
  )

  return {
    dailyRate: round2(dailyRate),
    monthlyRate: round2(monthlyRate),
    completedYears,
    proratedDays,
    daysInFinalMonth,
    lines,
    grossTotal,
    deductions: round2(deductions),
    total: round2(Math.max(0, grossTotal - deductions)),
  }
}

/**
 * Default offboarding checklist.
 *
 * Deliberately ordered by what goes wrong when it is skipped: access first (a
 * leaver with a live login is the real risk), then money, then paperwork.
 */
export const DEFAULT_OFFBOARDING_TASKS: ReadonlyArray<{
  title: string
  category: string
  required: boolean
}> = [
  { title: 'Revoke system and app access', category: 'access', required: true },
  { title: 'Collect keys, badge and uniform', category: 'equipment', required: true },
  { title: 'Collect laptop, phone and tools', category: 'equipment', required: true },
  { title: 'Hand over open work and customers', category: 'handover', required: true },
  { title: 'Clear outstanding cash advances', category: 'payroll', required: true },
  { title: 'Confirm final timesheet and overtime', category: 'payroll', required: true },
  { title: 'Agree and pay the final settlement', category: 'payroll', required: true },
  { title: 'Return company documents and files', category: 'documents', required: false },
  { title: 'Hold the exit interview', category: 'compliance', required: false },
  { title: 'Issue the service certificate', category: 'documents', required: false },
]

/**
 * Default onboarding checklist.
 *
 * Same logic: the payroll-blocking items (tax number, bank details) are required,
 * because an employee without them cannot be paid.
 */
export const DEFAULT_ONBOARDING_TASKS: ReadonlyArray<{
  title: string
  category: string
  required: boolean
}> = [
  { title: 'Signed employment contract on file', category: 'documents', required: true },
  { title: 'ID / passport copy collected', category: 'documents', required: true },
  { title: 'Tax number recorded', category: 'payroll', required: true },
  { title: 'Social insurance number recorded', category: 'payroll', required: true },
  { title: 'Bank account / IBAN recorded', category: 'payroll', required: true },
  { title: 'Emergency contact recorded', category: 'compliance', required: true },
  { title: 'System account created and role assigned', category: 'access', required: true },
  { title: 'Uniform and equipment issued', category: 'equipment', required: false },
  { title: 'Induction and till/POS training done', category: 'other', required: false },
  { title: 'Line manager introduced to the team', category: 'other', required: false },
]
