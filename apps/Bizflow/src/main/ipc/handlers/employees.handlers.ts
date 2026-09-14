/**
 * Employees IPC Handlers
 * Full employee lifecycle: profile, attendance, documents, activity log, payroll
 */

import { ipcMain, dialog, app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from '../../utils/logger'
import {
  DEFAULT_OFFBOARDING_TASKS,
  DEFAULT_ONBOARDING_TASKS,
  computeSettlement,
} from '../../../shared/hrSettlement'
import {
  canEditPeriod,
  nextRunStatus,
} from '../../../shared/hrPayrollRun'
import { hourlyRateFor } from '../../../shared/hrRate'
import { ensureHrSchema } from '../../../shared/hrSchema'
import {
  decodePayrollPeriod,
  periodRangeOf,
  periodTypeOf,
  periodsOverlap,
  calendarMonthSpan,
} from '../../../shared/hrPayrollPeriod'

const log = createLogger('Employees')

// Directory where uploaded employee documents are stored
function employeeDocsDir(): string {
  const dir = path.join(app.getPath('userData'), 'employee-documents')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Shared include for full employee profile
const EMPLOYEE_INCLUDE = {
  attendance: { orderBy: { date: 'desc' as const }, take: 90 },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
  activityLogs: { orderBy: { createdAt: 'desc' as const }, take: 50 },
  payrollRecords: { orderBy: [{ year: 'desc' as const }, { month: 'desc' as const }], take: 24 },
  shifts: { orderBy: { date: 'desc' as const }, take: 60 },
  overtimeRecords: { orderBy: { date: 'desc' as const }, take: 60 },
  leaveRecords: { orderBy: { startDate: 'desc' as const }, take: 60 },
  checklistItems: { orderBy: [{ phase: 'asc' as const }, { sortOrder: 'asc' as const }] },
  manager: { select: { id: true, name: true, role: true, avatarUrl: true } },
  reports: { select: { id: true, name: true, role: true, status: true, avatarUrl: true }, orderBy: { name: 'asc' as const } }
}

/**
 * Would assigning `managerId` to employee `id` create a cycle?
 * Walks the prospective manager's own reporting chain upward; a cycle exists
 * if we ever reach `id` again.
 */
async function wouldCreateCycle(prisma: any, id: string, managerId: string): Promise<boolean> {
  let cursor: string | null = managerId
  const seen = new Set<string>()
  while (cursor) {
    if (cursor === id) return true
    if (seen.has(cursor)) break
    seen.add(cursor)
    const m: { managerId: string | null } | null = await prisma.employee.findUnique({
      where: { id: cursor }, select: { managerId: true }
    })
    cursor = m?.managerId ?? null
  }
  return false
}

/**
 * Fields whose audit entry records the old and new value, not just the name.
 *
 * `profile_updated: salary, role` told nobody anything. A pay rise, a promotion
 * or a status change is exactly what an HR audit is *for*, so those keep a
 * before → after trace. Everything else is still listed by name only, which
 * keeps the log readable.
 */
const HR_AUDITED_FIELDS: readonly string[] = [
  'salary', 'salaryType', 'role', 'department', 'status', 'employmentType',
  'managerId', 'hireDate', 'contractEndDate', 'idExpiryDate', 'terminationDate',
  'annualLeaveDays', 'iban', 'bankName', 'taxId', 'socialInsuranceNo', 'email',
]

function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

/** Human-readable diff of an employee update, for the activity log. */
function describeEmployeeChanges(before: any, patch: Record<string, any>): string {
  const detailed: string[] = []
  const namesOnly: string[] = []

  for (const key of Object.keys(patch)) {
    const next = patch[key]
    const prev = before ? before[key] : undefined
    const changed = prev instanceof Date || next instanceof Date
      ? formatAuditValue(prev) !== formatAuditValue(next)
      : prev !== next
    if (!changed) continue
    if (HR_AUDITED_FIELDS.includes(key)) {
      detailed.push(`${key}: ${formatAuditValue(prev)} → ${formatAuditValue(next)}`)
    } else {
      namesOnly.push(key)
    }
  }

  if (!detailed.length && !namesOnly.length) return 'Profile saved with no field changes'

  const parts = [...detailed]
  if (namesOnly.length) parts.push(`${namesOnly.length} other field(s): ${namesOnly.join(', ')}`)
  return `Profile updated — ${parts.join('; ')}`
}

// Hourly rates are priced by `hourlyRateFor` from `shared/hrRate`. The copy that
// used to live here agreed with payroll but not with the employee profile modal,
// which divided daily-paid staff by 160 instead of 8.

// Compute attendance summary from attendance records
function computeAttendanceSummary(attendance: any[]) {
  const total = attendance.length
  const present = attendance.filter(a => a.status === 'present').length
  const absent = attendance.filter(a => a.status === 'absent').length
  const late = attendance.filter(a => a.status === 'late').length
  const onLeave = attendance.filter(a => a.status === 'leave').length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  return { total, present, absent, late, onLeave, rate }
}

// Compute the annual paid-leave balance for the current year
function computeLeaveBalance(emp: any) {
  const allowance = emp.annualLeaveDays ?? 21
  const year = new Date().getFullYear()
  const annual = (emp.leaveRecords ?? []).filter(
    (l: any) => l.type === 'annual' && new Date(l.startDate).getFullYear() === year
  )
  const taken = annual.filter((l: any) => l.status === 'approved').reduce((s: number, l: any) => s + (l.days ?? 0), 0)
  const pending = annual.filter((l: any) => l.status === 'pending').reduce((s: number, l: any) => s + (l.days ?? 0), 0)
  return { allowance, taken, pending, remaining: Math.max(0, allowance - taken) }
}

export function registerEmployeesHandlers(prisma: any) {
  // Additive schema sync (idempotent raw DDL, safe in packaged installs where
  // `prisma db push` isn't available). Lives in `shared/hrSchema` so the seed
  // and verifier scripts outside Electron apply exactly the same DDL.
  if (prisma) void ensureHrSchema(prisma, log)

  // ─── LIST ──────────────────────────────────────────────────
  ipcMain.handle('employees:getAll', async () => {
    try {
      if (!prisma) return []
      const today = new Date(); today.setUTCHours(0, 0, 0, 0)
      const emps = await prisma.employee.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              attendance: true,
              activityLogs: true,
              reports: true,
              // Open required tasks per phase, so the list page can flag incomplete
              // onboarding and unclosed offboarding without loading every checklist.
              checklistItems: { where: { completed: false, required: true, phase: 'onboarding' } },
            },
          },
          manager: { select: { id: true, name: true } },
          attendance: { where: { date: today }, take: 1, select: { checkIn: true, checkOut: true, status: true } }
        }
      })
      // Flatten today's attendance onto each employee for quick card display
      return emps.map((e: any) => {
        const { attendance, ...rest } = e
        return { ...rest, todayAttendance: attendance?.[0] ?? null }
      })
    } catch (error) {
      log.error('Error fetching employees:', error)
      throw error
    }
  })

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  ipcMain.handle('employees:getById', async (_, id: string) => {
    try {
      if (!prisma) return null
      const emp = await prisma.employee.findUnique({
        where: { id },
        include: EMPLOYEE_INCLUDE
      })
      if (!emp) return null
      return {
        ...emp,
        attendanceSummary: computeAttendanceSummary(emp.attendance),
        leaveBalance: computeLeaveBalance(emp)
      }
    } catch (error) {
      log.error('Error fetching employee:', error)
      throw error
    }
  })

  // ─── CREATE ───────────────────────────────────────────────────────────────
  ipcMain.handle('employees:create', async (_, employeeData: any) => {
    try {
      if (!prisma) return { success: false, message: 'Database not available' }
      const { createdBy, performedBy, ...data } = employeeData
      if (!data.managerId) data.managerId = null
      const employee = await prisma.employee.create({ data })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: employee.id,
          action: 'employee_created',
          details: `Employee profile created`,
          performedBy: createdBy ?? performedBy ?? null
        }
      })
      return { success: true, employee }
    } catch (error: any) {
      log.error('Error creating employee:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  ipcMain.handle('employees:update', async (_, { id, employeeData }: { id: string; employeeData: any }) => {
    try {
      if (!prisma) return { success: false, message: 'Database not available' }
      const { performedBy, ...data } = employeeData
      // Org-chart guards: an employee can't manage themselves or form a cycle.
      if ('managerId' in data) {
        if (data.managerId === '') data.managerId = null
        if (data.managerId) {
          if (data.managerId === id) return { success: false, message: 'An employee cannot report to themselves' }
          if (await wouldCreateCycle(prisma, id, data.managerId)) {
            return { success: false, message: 'That assignment would create a reporting loop' }
          }
        }
      }
      const before = await prisma.employee.findUnique({ where: { id } })
      const employee = await prisma.employee.update({ where: { id }, data })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: id,
          action: 'profile_updated',
          details: describeEmployeeChanges(before, data),
          performedBy: performedBy ?? null
        }
      })
      return { success: true, employee }
    } catch (error: any) {
      log.error('Error updating employee:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── DELETE ───────────────────────────────────────────────────────────────
  ipcMain.handle('employees:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false, message: 'Database not available' }
      await prisma.employee.delete({ where: { id } })
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting employee:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  ipcMain.handle('employees:attendance:upsert', async (_, { employeeId, date, status, checkIn, checkOut, notes, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const record = await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId, date: dayStart } },
        create: { employeeId, date: dayStart, status, checkIn, checkOut, notes },
        update: { status, checkIn, checkOut, notes }
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: 'attendance_recorded',
          details: `${status} on ${dayStart.toLocaleDateString()}`,
          performedBy: performedBy ?? null
        }
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error upserting attendance:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:attendance:getRange', async (_, { employeeId, from, to }: any) => {
    try {
      if (!prisma) return []
      return await prisma.employeeAttendance.findMany({
        where: {
          employeeId,
          date: { gte: new Date(from), lte: new Date(to) }
        },
        orderBy: { date: 'asc' }
      })
    } catch (error) {
      log.error('Error fetching attendance range:', error)
      return []
    }
  })

  // Check-in shortcut
  ipcMain.handle('employees:attendance:checkIn', async (_, { employeeId }: any) => {
    try {
      if (!prisma) return { success: false }
      const now = new Date()
      const dayStart = new Date(now)
      dayStart.setUTCHours(0, 0, 0, 0)

      // Guard: only allow one check-in per day
      const existing = await prisma.employeeAttendance.findUnique({
        where: { employeeId_date: { employeeId, date: dayStart } }
      })
      if (existing?.checkIn) {
        return {
          success: false,
          alreadyIn: true,
          message: `Already checked in today at ${new Date(existing.checkIn).toLocaleTimeString()}`
        }
      }

      // Late detection: compare against today's scheduled shift start (5-min grace)
      const nextDay = new Date(dayStart); nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      const shift = await prisma.employeeShift.findFirst({
        where: { employeeId, date: { gte: dayStart, lt: nextDay } }
      })
      let status = 'present'
      if (shift?.startTime) {
        const [h, m] = String(shift.startTime).split(':').map(Number)
        if (!isNaN(h)) {
          const shiftStart = new Date(now); shiftStart.setHours(h, m || 0, 0, 0)
          if (now.getTime() > shiftStart.getTime() + 5 * 60 * 1000) status = 'late'
        }
      }

      const record = await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId, date: dayStart } },
        create: { employeeId, date: dayStart, status, checkIn: now },
        update: { checkIn: now, status }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'checked_in', details: `Checked in at ${now.toLocaleTimeString()}${status === 'late' ? ' (late)' : ''}` }
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error checking in:', error)
      return { success: false, message: error.message }
    }
  })

  // Check-out shortcut
  ipcMain.handle('employees:attendance:checkOut', async (_, { employeeId }: any) => {
    try {
      if (!prisma) return { success: false }
      const now = new Date()
      const dayStart = new Date(now)
      dayStart.setUTCHours(0, 0, 0, 0)

      // Guard: must have checked in, and must not have checked out yet
      const existing = await prisma.employeeAttendance.findUnique({
        where: { employeeId_date: { employeeId, date: dayStart } }
      })
      if (!existing?.checkIn) {
        return { success: false, message: 'Employee has not checked in today' }
      }
      if (existing.checkOut) {
        return {
          success: false,
          alreadyOut: true,
          message: `Already checked out today at ${new Date(existing.checkOut).toLocaleTimeString()}`
        }
      }

      const record = await prisma.employeeAttendance.update({
        where: { employeeId_date: { employeeId, date: dayStart } },
        data: { checkOut: now }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'checked_out', details: `Checked out at ${now.toLocaleTimeString()}` }
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error checking out:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── PAYROLL ──────────────────────────────────────────────────────────────

  /**
   * Auto-compute overtime pay from approved EmployeeOvertime records in a date range.
   *
   * Takes real dates, not a month number. It used to take the packed period key and
   * do `new Date(year, month - 1, 1)`, so a weekly period (key 1001) looked for
   * overtime in the year 3008 and found none — weekly and daily payroll silently
   * never paid overtime at all.
   *
   * Priced from the employee's own rate (see `hourlyRateFor`), not from the base
   * salary passed into payroll: for hourly or daily staff the payroll row's
   * `baseSalary` is an amount for the period, not a rate.
   */
  async function computeOvertimeForMonth(employeeId: string, start: Date, end: Date) {
    if (!prisma) return { overtimeHours: 0, overtimePay: 0 }
    const [records, employee] = await Promise.all([
      prisma.employeeOvertime.findMany({
        where: { employeeId, approved: true, date: { gte: start, lte: end } }
      }),
      prisma.employee.findUnique({ where: { id: employeeId }, select: { salary: true, salaryType: true } }),
    ])
    const rate = hourlyRateFor(employee?.salary ?? 0, employee?.salaryType ?? 'monthly')
    const overtimeHours: number = records.reduce((s: number, r: any) => s + (r.hours ?? 0), 0)
    const overtimePay: number = records.reduce(
      (s: number, r: any) => s + (r.hours ?? 0) * rate * (r.multiplier ?? 1.5),
      0
    )
    return { overtimeHours, overtimePay }
  }

  /** Count extra/double shifts in a date range. Same date-not-integer fix. */
  async function countExtraShiftsForMonth(employeeId: string, start: Date, end: Date) {
    if (!prisma) return 0
    const shifts = await prisma.employeeShift.findMany({
      where: { employeeId, date: { gte: start, lte: end } }
    })
    // Count shifts explicitly typed as 'extra', or days with >1 shift
    const byDay: Record<string, number> = {}
    for (const s of shifts) {
      const key = new Date(s.date).toISOString().slice(0, 10)
      byDay[key] = (byDay[key] ?? 0) + 1
    }
    let extras = shifts.filter((s: any) => s.shiftType === 'extra').length
    for (const count of Object.values(byDay)) {
      if (count > 1) extras += count - 1
    }
    return extras
  }

  /**
   * The dates a payroll payload's period covers.
   *
   * Prefers the dates the UI sends; falls back to decoding the packed key so an
   * older build — or the offboarding settlement, which only knows a month — still
   * lands on the right range instead of a wild one.
   */
  function periodFromPayload(payload: {
    year: number
    month: number
    periodType?: string
    periodKey?: string
    periodStart?: string
    periodEnd?: string
  }): { start: Date; end: Date; periodType: string; periodKey: string } {
    const start = payload.periodStart ? new Date(payload.periodStart) : null
    const end = payload.periodEnd ? new Date(payload.periodEnd) : null
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return {
        start,
        end,
        periodType: String(payload.periodType ?? periodTypeOf(Number(payload.month))),
        periodKey: String(payload.periodKey ?? `${payload.year}-${payload.month}`),
      }
    }
    const decoded = decodePayrollPeriod(Number(payload.month), Number(payload.year))
    return {
      start: new Date(decoded.periodStart),
      end: new Date(decoded.periodEnd),
      periodType: decoded.periodType,
      periodKey: decoded.periodKey,
    }
  }

  ipcMain.handle('employees:payroll:upsert', async (_, {
    employeeId, month, year,
    periodType, periodKey, periodStart, periodEnd,
    baseSalary,
    regularHours,
    overtimeHours, overtimePay,
    extraShifts, extraShiftPay, extraShiftBonusPerShift,
    bonuses, deductions,
    notes, status, paidDate, performedBy, reopen,
  }: any) => {
    try {
      if (!prisma) return { success: false }

      // A closed period is closed. This is also what stops the offboarding
      // "create final payslip" from quietly rewriting a month that was settled and
      // paid weeks ago.
      const gate = await assertPeriodOpen(Number(year), Number(month))
      if (!gate.ok) return { success: false, message: gate.message }

      // The period's real dates. Overtime and extra shifts are matched on these,
      // never on the packed key.
      const period = periodFromPayload({
        year: Number(year),
        month: Number(month),
        periodType,
        periodKey,
        periodStart,
        periodEnd,
      })

      const base = baseSalary ?? 0
      const bon  = bonuses    ?? 0
      const ded  = deductions ?? 0

      const existing = await prisma.employeePayroll.findUnique({
        where: { employeeId_month_year: { employeeId, month, year } },
      })

      // Auto-compute overtime from EmployeeOvertime records if not provided
      let otHours = overtimeHours ?? null
      let otPay   = overtimePay   ?? null
      if (otPay == null) {
        const ot = await computeOvertimeForMonth(employeeId, period.start, period.end)
        otHours = ot.overtimeHours
        otPay   = ot.overtimePay
      }

      // Auto-compute extra shifts if not provided
      let xShifts = extraShifts   ?? null
      let xPay    = extraShiftPay ?? null
      if (xPay == null) {
        xShifts = await countExtraShiftsForMonth(employeeId, period.start, period.end)
        const bonusPerShift = extraShiftBonusPerShift ?? 0
        xPay = (xShifts as number) * bonusPerShift
      }

      const grossPay = base + (otPay as number) + (xPay as number) + bon
      const netPay   = grossPay - ded

      // A paid period is history. Editing it must never silently un-pay it, which
      // is exactly what the old code did: the edit form always sent `pending`, so
      // opening a paid row to look at it and pressing save reset it to pending and
      // wiped `paidDate`. Reversing a payment now takes an explicit `reopen`.
      const isReopen = reopen === true
      const nextStatus = isReopen ? 'pending' : (status ?? existing?.status ?? 'pending')
      const nextPaidDate = isReopen
        ? null
        : paidDate
          ? new Date(paidDate)
          : existing?.paidDate ?? null

      const data = {
        baseSalary: base,
        // Period dates are rewritten on every save so an older row self-heals.
        periodType: period.periodType,
        periodKey: period.periodKey,
        periodStart: period.start,
        periodEnd: period.end,
        regularHours: regularHours ?? existing?.regularHours ?? 0,
        overtimeHours: otHours as number,
        overtimePay:   otPay   as number,
        extraShifts:   xShifts as number,
        extraShiftPay: xPay    as number,
        bonuses: bon,
        deductions: ded,
        grossPay,
        netPay,
        status: nextStatus,
        notes: notes ?? null,
        paidDate: nextPaidDate,
      }

      const record = await prisma.employeePayroll.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        create: { employeeId, month, year, ...data },
        update: data,
      })

      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: isReopen
            ? 'payroll_reopened'
            : nextStatus === 'paid'
              ? 'payroll_paid'
              : 'payroll_updated',
          details: isReopen
            ? `Payroll ${month}/${year} reopened for editing (net $${netPay.toFixed(2)})`
            : `Payroll ${month}/${year}: base $${base.toFixed(2)}, OT $${(otPay as number).toFixed(2)}, extra-shifts $${(xPay as number).toFixed(2)}, net $${netPay.toFixed(2)}`,
          performedBy: performedBy ?? null,
        }
      })
      await refreshRunTotals(Number(year), Number(month))
      return { success: true, record }
    } catch (error: any) {
      log.error('Error upserting payroll:', error)
      return { success: false, message: error.message }
    }
  })

  /** Dry-run: compute full payroll breakdown without saving. */
  ipcMain.handle('employees:payroll:compute', async (_, { employeeId, month, year, periodStart, periodEnd, baseSalary, extraShiftBonusPerShift }: any) => {
    try {
      if (!prisma) return null
      const base = baseSalary ?? 0
      const period = periodFromPayload({ year: Number(year), month: Number(month), periodStart, periodEnd })
      const [ot, xShifts] = await Promise.all([
        computeOvertimeForMonth(employeeId, period.start, period.end),
        countExtraShiftsForMonth(employeeId, period.start, period.end),
      ])
      const bonusPerShift = extraShiftBonusPerShift ?? 0
      const xPay    = xShifts * bonusPerShift
      const grossPay = base + ot.overtimePay + xPay
      return {
        baseSalary:   base,
        regularHours: 0,
        overtimeHours: ot.overtimeHours,
        overtimePay:   ot.overtimePay,
        extraShifts:   xShifts,
        extraShiftPay: xPay,
        bonuses:    0,
        deductions: 0,
        grossPay,
        netPay: grossPay,
      }
    } catch (error) {
      log.error('Error computing payroll:', error)
      return null
    }
  })

  ipcMain.handle('employees:payroll:getAll', async (_, { year }: { year: number }) => {
    try {
      if (!prisma) return []
      return await prisma.employeePayroll.findMany({
        where: { year },
        include: { employee: { select: { id: true, name: true, role: true, department: true, salary: true, salaryType: true } } },
        orderBy: [{ month: 'desc' }, { employee: { name: 'asc' } }]
      })
    } catch (error) {
      log.error('Error fetching payroll:', error)
      return []
    }
  })

  ipcMain.handle('employees:payroll:markPaid', async (_, payload: any) => {
    try {
      if (!prisma) return { success: false }
      // Accepts either the bare id (existing callers) or { id, performedBy }.
      const id = typeof payload === 'string' ? payload : payload?.id
      const performedBy = typeof payload === 'string' ? null : payload?.performedBy ?? null
      if (!id) return { success: false, message: 'Missing payroll record id' }

      const before = await prisma.employeePayroll.findUnique({ where: { id } })
      if (!before) return { success: false, message: 'Payroll record not found' }

      const gate = await assertPeriodOpen(before.year, before.month)
      if (!gate.ok) return { success: false, message: gate.message }

      const record = await prisma.employeePayroll.update({
        where: { id },
        data: { status: 'paid', paidDate: new Date() },
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: record.employeeId,
          action: 'payroll_paid',
          details: `Payroll ${record.month}/${record.year} marked as paid`,
          performedBy: performedBy ?? null,
        },
      })
      await refreshRunTotals(record.year, record.month)
      return { success: true, record }
    } catch (error: any) {
      log.error('Error marking payroll as paid:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── PAYROLL RUNS (period state) ──────────────────────────────────────────

  /**
   * The run for a period, or null.
   *
   * Swallows a missing table so an install upgrading from an older release keeps
   * working: the lock simply is not in force until the migration has run.
   */
  async function findRun(year: number, month: number) {
    if (!prisma) return null
    try {
      return await prisma.payrollRun.findUnique({ where: { year_month: { year, month } } })
    } catch {
      return null
    }
  }

  /** May this period's payslips be changed? */
  async function assertPeriodOpen(year: number, month: number): Promise<{ ok: true } | { ok: false; message: string }> {
    const run = await findRun(year, month)
    if (run && !canEditPeriod(run.status)) {
      return {
        ok: false,
        message: `This period is ${run.status} and its payslips are frozen. Reopen the run before changing them.`,
      }
    }
    return { ok: true }
  }

  /** Keep the run's headline figures in step with its records. */
  async function refreshRunTotals(year: number, month: number) {
    if (!prisma) return
    const run = await findRun(year, month)
    if (!run) return
    try {
      const agg = await prisma.employeePayroll.aggregate({
        where: { year, month },
        _count: { _all: true },
        _sum: { grossPay: true, netPay: true, deductions: true },
      })
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          headcount: agg._count?._all ?? 0,
          grossTotal: agg._sum?.grossPay ?? 0,
          netTotal: agg._sum?.netPay ?? 0,
        },
      })
    } catch (error) {
      log.warn('Could not refresh payroll run totals', error)
    }
  }

  ipcMain.handle('employees:payrollRuns:get', async (_, { year, month }: any) => {
    return findRun(Number(year), Number(month))
  })

  /** Create the draft run for a period, or return the existing one. */
  ipcMain.handle('employees:payrollRuns:ensure', async (_, { year, month, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const y = Number(year), m = Number(month)
      let run = await findRun(y, m)
      if (!run) {
        run = await prisma.payrollRun.create({
          data: { year: y, month: m, status: 'draft', createdBy: performedBy ?? null },
        })
      }
      await refreshRunTotals(y, m)
      return { success: true, run: await findRun(y, m) }
    } catch (error: any) {
      log.error('Error creating payroll run:', error)
      return { success: false, message: error.message }
    }
  })

  /** draft → approved. Freezes the payslips. */
  ipcMain.handle('employees:payrollRuns:approve', async (_, { year, month, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const y = Number(year), m = Number(month)
      const run = await findRun(y, m)
      if (!run) return { success: false, message: 'No payroll run for this period yet' }
      const status = nextRunStatus(run.status, 'approve')
      if (!status) return { success: false, message: `This run is already ${run.status}` }

      const count = await prisma.employeePayroll.count({ where: { year: y, month: m } })
      if (!count) return { success: false, message: 'There is nothing to approve — no payslips in this period' }

      await refreshRunTotals(y, m)
      const updated = await prisma.payrollRun.update({
        where: { id: run.id },
        data: { status, approvedBy: performedBy ?? null, approvedAt: new Date() },
      })
      return { success: true, run: updated }
    } catch (error: any) {
      log.error('Error approving payroll run:', error)
      return { success: false, message: error.message }
    }
  })

  /** approved → paid: mark every outstanding payslip in the period as paid. */
  ipcMain.handle('employees:payrollRuns:markAllPaid', async (_, { year, month, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const y = Number(year), m = Number(month)
      const run = await findRun(y, m)
      if (!run) return { success: false, message: 'No payroll run for this period yet' }
      const status = nextRunStatus(run.status, 'markPaid')
      if (!status) {
        return {
          success: false,
          message: run.status === 'draft'
            ? 'Approve the run before paying it'
            : `This run is already ${run.status}`,
        }
      }

      const now = new Date()
      const result = await prisma.employeePayroll.updateMany({
        where: { year: y, month: m, status: 'pending' },
        data: { status: 'paid', paidDate: now },
      })
      const updated = await prisma.payrollRun.update({
        where: { id: run.id },
        data: { status },
      })
      await refreshRunTotals(y, m)

      // One entry per run rather than one per employee: this is a period-level act.
      if (result.count) {
        const anyRecord = await prisma.employeePayroll.findFirst({ where: { year: y, month: m }, select: { employeeId: true } })
        if (anyRecord) {
          await prisma.employeeActivityLog.create({
            data: {
              employeeId: anyRecord.employeeId,
              action: 'payroll_run_paid',
              details: `${result.count} payslip(s) in ${m}/${y} marked paid`,
              performedBy: performedBy ?? null,
            },
          })
        }
      }
      return { success: true, run: updated, paid: result.count }
    } catch (error: any) {
      log.error('Error marking payroll run paid:', error)
      return { success: false, message: error.message }
    }
  })

  /** paid → locked: closed for the books. */
  ipcMain.handle('employees:payrollRuns:lock', async (_, { year, month, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const y = Number(year), m = Number(month)
      const run = await findRun(y, m)
      if (!run) return { success: false, message: 'No payroll run for this period yet' }
      const status = nextRunStatus(run.status, 'lock')
      if (!status) return { success: false, message: 'Only a paid run can be locked' }

      const updated = await prisma.payrollRun.update({
        where: { id: run.id },
        data: { status, lockedAt: new Date(), approvedBy: performedBy ?? run.approvedBy },
      })
      return { success: true, run: updated }
    } catch (error: any) {
      log.error('Error locking payroll run:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Any status → draft.
   *
   * The escape hatch, and deliberately noisy: it records who reopened a closed
   * period and why, because a changed payslip after the fact is exactly the thing
   * an auditor asks about.
   */
  ipcMain.handle('employees:payrollRuns:reopen', async (_, { year, month, performedBy, reason }: any) => {
    try {
      if (!prisma) return { success: false }
      const y = Number(year), m = Number(month)
      const run = await findRun(y, m)
      if (!run) return { success: false, message: 'No payroll run for this period yet' }
      const status = nextRunStatus(run.status, 'reopen')
      if (!status) return { success: true, run }

      const updated = await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          status,
          reopenedBy: performedBy ?? null,
          reopenedAt: new Date(),
          reopenReason: reason ? String(reason).slice(0, 500) : null,
        },
      })

      const anyRecord = await prisma.employeePayroll.findFirst({ where: { year: y, month: m }, select: { employeeId: true } })
      if (anyRecord) {
        await prisma.employeeActivityLog.create({
          data: {
            employeeId: anyRecord.employeeId,
            action: 'payroll_run_reopened',
            details: `${m}/${y} reopened from ${run.status}${reason ? ` · ${reason}` : ''}`,
            performedBy: performedBy ?? null,
          },
        })
      }
      return { success: true, run: updated }
    } catch (error: any) {
      log.error('Error reopening payroll run:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Payment file for the period.
   *
   * Returns rows rather than writing a file: the renderer already exports CSV
   * elsewhere, and the bank's exact format differs per institution, so handing
   * back clean data beats inventing a format nobody can import.
   */
  ipcMain.handle('employees:payrollRuns:bankExport', async (_, { year, month }: any) => {
    try {
      if (!prisma) return { rows: [], missing: [] }
      const y = Number(year), m = Number(month)
      const records = await prisma.employeePayroll.findMany({
        where: { year: y, month: m },
        include: { employee: { select: { name: true, bankName: true, iban: true } } },
        orderBy: { netPay: 'desc' },
      })
      const rows = records.map((record: any) => ({
        name: record.employee?.name ?? '',
        bankName: record.employee?.bankName ?? '',
        iban: record.employee?.iban ?? '',
        amount: record.netPay ?? 0,
        reference: `SAL ${String(m).padStart(2, '0')}/${y}`,
        status: record.status,
      }))
      // Paying somebody with no bank details is a manual transfer, so call it out
      // rather than silently dropping them from the file.
      const missing = rows.filter((row: any) => !row.iban).map((row: any) => row.name)
      return { rows, missing }
    } catch (error: any) {
      log.error('Error building bank export:', error)
      return { rows: [], missing: [] }
    }
  })

  /**
   * getSummary — aggregates payroll records across a range of months/years.
   * Returns per-employee breakdown totals plus an overall grand total.
   */
  ipcMain.handle('employees:payroll:getSummary', async (_, { startYear, startMonth, endYear, endMonth }: { startYear: number; startMonth: number; endYear: number; endMonth: number }) => {
    try {
      if (!prisma) return { employees: [], totals: {} }

      // Fetch by year, then decide period overlap using real dates.
      //
      // The old filter compared the packed `month` key against calendar months
      // (`month BETWEEN 1 AND 12`). Weekly periods live at 1001+ and daily at
      // 2000+, so they fell outside the range and were silently missing from every
      // payroll total shown in Finance. Filtering on dates means a period is
      // included when it genuinely overlaps the requested months.
      const span = calendarMonthSpan(startYear, startMonth, endYear, endMonth)
      const candidates = await prisma.employeePayroll.findMany({
        where: { year: { gte: Math.min(startYear, endYear), lte: Math.max(startYear, endYear) } },
        include: { employee: { select: { id: true, name: true, role: true, department: true } } },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      })
      const records = candidates.filter((record: any) => {
        const range = periodRangeOf(record)
        return periodsOverlap(range.start, range.end, span.start, span.end)
      })

      const empMap: Record<string, any> = {}
      for (const r of records) {
        if (!empMap[r.employeeId]) {
          empMap[r.employeeId] = {
            employeeId: r.employeeId,
            name:       r.employee?.name ?? 'Unknown',
            role:       r.employee?.role ?? '',
            department: r.employee?.department ?? '',
            baseSalary:    0, regularHours: 0,
            overtimeHours: 0, overtimePay:   0,
            extraShifts:   0, extraShiftPay: 0,
            bonuses: 0, deductions: 0, grossPay: 0, netPay: 0,
            recordCount: 0, hasPending: false,
          }
        }
        const e = empMap[r.employeeId]
        e.baseSalary    += r.baseSalary    ?? 0
        e.regularHours  += r.regularHours  ?? 0
        e.overtimeHours += r.overtimeHours ?? 0
        e.overtimePay   += r.overtimePay   ?? 0
        e.extraShifts   += r.extraShifts   ?? 0
        e.extraShiftPay += r.extraShiftPay ?? 0
        e.bonuses       += r.bonuses       ?? 0
        e.deductions    += r.deductions    ?? 0
        e.grossPay      += r.grossPay      ?? 0
        e.netPay        += r.netPay        ?? 0
        e.recordCount   += 1
        if (r.status !== 'paid') e.hasPending = true
      }

      const employees = Object.values(empMap)
      const totals = employees.reduce((acc: any, e: any) => ({
        baseSalary:    (acc.baseSalary    ?? 0) + e.baseSalary,
        regularHours:  (acc.regularHours  ?? 0) + e.regularHours,
        overtimeHours: (acc.overtimeHours ?? 0) + e.overtimeHours,
        overtimePay:   (acc.overtimePay   ?? 0) + e.overtimePay,
        extraShifts:   (acc.extraShifts   ?? 0) + e.extraShifts,
        extraShiftPay: (acc.extraShiftPay ?? 0) + e.extraShiftPay,
        bonuses:       (acc.bonuses       ?? 0) + e.bonuses,
        deductions:    (acc.deductions    ?? 0) + e.deductions,
        grossPay:      (acc.grossPay      ?? 0) + e.grossPay,
        netPay:        (acc.netPay        ?? 0) + e.netPay,
      }), {})

      return { employees, totals }
    } catch (error) {
      log.error('Error fetching payroll summary:', error)
      return { employees: [], totals: {} }
    }
  })

  // ─── ACTIVITY LOG ─────────────────────────────────────────────────────────
  ipcMain.handle('employees:activity:add', async (_, { employeeId, action, details, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const log_ = await prisma.employeeActivityLog.create({
        data: { employeeId, action, details, performedBy: performedBy ?? null }
      })
      return { success: true, log: log_ }
    } catch (error: any) {
      log.error('Error adding activity log:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  ipcMain.handle('employees:search', async (_, { query, status, department, role }: any) => {
    try {
      if (!prisma) return []
      const where: any = {}
      if (status) where.status = status
      if (department) where.department = department
      if (role) where.role = role
      if (query) {
        where.OR = [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { role: { contains: query } },
          { department: { contains: query } }
        ]
      }
      return await prisma.employee.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { attendance: true, activityLogs: true } } }
      })
    } catch (error) {
      log.error('Error searching employees:', error)
      return []
    }
  })

  // ─── STATS (dashboard) ────────────────────────────────────────────────────
  ipcMain.handle('employees:stats', async () => {
    try {
      if (!prisma) return null
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const [total, active, onLeave, terminatedCount, todayAttendance, payrollThisMonth] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: 'active' } }),
        prisma.employee.count({ where: { status: 'on-leave' } }),
        prisma.employee.count({ where: { status: 'terminated' } }),
        prisma.employeeAttendance.findMany({
          where: { date: today },
          select: { status: true }
        }),
        prisma.employeePayroll.aggregate({
          where: { month: today.getMonth() + 1, year: today.getFullYear() },
          _sum: { netPay: true }
        })
      ])
      const presentToday = todayAttendance.filter((a: any) => a.status === 'present').length
      return {
        total, active, onLeave, terminated: terminatedCount,
        presentToday,
        attendanceRate: active > 0 ? Math.round((presentToday / active) * 100) : 0,
        payrollThisMonth: payrollThisMonth._sum.netPay ?? 0
      }
    } catch (error) {
      log.error('Error fetching employee stats:', error)
      return null
    }
  })

  // ─── SHIFTS ───────────────────────────────────────────────────────────────
  ipcMain.handle('employees:shifts:add', async (_, { employeeId, date, shiftType, startTime, endTime, breakMins, notes }: any) => {
    try {
      if (!prisma) return { success: false }
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const shift = await prisma.employeeShift.create({
        data: { employeeId, date: dayStart, shiftType: shiftType || 'morning', startTime, endTime, breakMins: breakMins ?? 0, notes: notes || null }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'shift_added', details: `Shift ${shiftType} on ${dayStart.toLocaleDateString()}: ${startTime}–${endTime}` }
      })
      return { success: true, shift }
    } catch (error: any) {
      log.error('Error adding shift:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:shifts:getAll', async (_, { employeeId }: any) => {
    try {
      if (!prisma) return []
      return await prisma.employeeShift.findMany({
        where: { employeeId },
        orderBy: { date: 'desc' }
      })
    } catch (error) {
      log.error('Error fetching shifts:', error)
      return []
    }
  })

  ipcMain.handle('employees:shifts:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      const shift = await prisma.employeeShift.findUnique({ where: { id } })
      await prisma.employeeShift.delete({ where: { id } })
      if (shift) {
        await prisma.employeeActivityLog.create({
          data: { employeeId: shift.employeeId, action: 'shift_deleted', details: `Shift ${shift.shiftType} deleted` }
        })
      }
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting shift:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── APPROVALS ────────────────────────────────────────────────────────────
  /**
   * Everything the team is waiting on a manager to decide, in one call.
   *
   * Approvals used to exist only *inside* an employee's profile, so clearing a
   * queue of five requests meant opening five profiles and hoping you had found
   * them all. This is the query behind the Approvals inbox.
   */
  ipcMain.handle('employees:approvals:pending', async () => {
    try {
      if (!prisma) return { leave: [], overtime: [] }
      const employeeSelect = { id: true, name: true, role: true, department: true, avatarUrl: true }
      const [leave, overtime] = await Promise.all([
        prisma.employeeLeave.findMany({
          where: { status: 'pending' },
          include: { employee: { select: employeeSelect } },
          orderBy: { startDate: 'asc' },
        }),
        prisma.employeeOvertime.findMany({
          where: { approved: false },
          include: { employee: { select: employeeSelect } },
          orderBy: { date: 'asc' },
        }),
      ])

      // Annual-leave remaining, so the approver can see that a request would take
      // someone past their allowance *before* approving it. Deciding that blind is
      // how people end up owing the business days they never had.
      const employeeIds: string[] = Array.from(new Set(leave.map((l: any) => l.employeeId)))
      const leaveBalance: Record<string, { allowance: number; taken: number; remaining: number }> = {}
      if (employeeIds.length) {
        const year = new Date().getFullYear()
        const [employees, approvedAnnual] = await Promise.all([
          prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, annualLeaveDays: true },
          }),
          prisma.employeeLeave.findMany({
            where: {
              employeeId: { in: employeeIds },
              status: 'approved',
              type: 'annual',
              startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
            },
            select: { employeeId: true, days: true },
          }),
        ])
        const takenBy: Record<string, number> = {}
        for (const row of approvedAnnual) {
          takenBy[row.employeeId] = (takenBy[row.employeeId] ?? 0) + (row.days ?? 0)
        }
        for (const employee of employees) {
          const allowance = employee.annualLeaveDays ?? 21
          const taken = takenBy[employee.id] ?? 0
          leaveBalance[employee.id] = {
            allowance,
            taken,
            remaining: Math.max(0, allowance - taken),
          }
        }
      }

      return { leave, overtime, leaveBalance }
    } catch (error: any) {
      log.error('Error fetching pending approvals:', error)
      return { leave: [], overtime: [], leaveBalance: {} }
    }
  })

  // ─── OVERTIME ─────────────────────────────────────────────────────────────
  ipcMain.handle('employees:overtime:add', async (_, { employeeId, date, hours, reason, multiplier }: any) => {
    try {
      if (!prisma) return { success: false }
      const dayStart = new Date(date)
      dayStart.setUTCHours(0, 0, 0, 0)
      const ot = await prisma.employeeOvertime.create({
        data: { employeeId, date: dayStart, hours, reason: reason || null, multiplier: multiplier ?? 1.5, approved: false }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'overtime_logged', details: `${hours}h overtime on ${dayStart.toLocaleDateString()}` }
      })
      return { success: true, overtime: ot }
    } catch (error: any) {
      log.error('Error adding overtime:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Approve — or revoke approval of — an overtime record.
   *
   * `approved` used to be a one-way latch: a manager who approved the wrong row,
   * or approved before the hours were corrected, had no way back except deleting
   * the record, which also destroyed the history. Revoking is now explicit and
   * logged, and clearing `approvedBy` keeps the audit trail honest.
   */
  ipcMain.handle('employees:overtime:approve', async (_, { id, approvedBy, approved }: any) => {
    try {
      if (!prisma) return { success: false }
      const next = approved !== false
      const ot = await prisma.employeeOvertime.update({
        where: { id },
        data: { approved: next, approvedBy: next ? (approvedBy ?? null) : null }
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: ot.employeeId,
          action: next ? 'overtime_approved' : 'overtime_unapproved',
          details: next
            ? `${ot.hours}h overtime approved`
            : `${ot.hours}h overtime approval withdrawn`,
          performedBy: approvedBy ?? null,
        }
      })
      return { success: true, overtime: ot }
    } catch (error: any) {
      log.error('Error updating overtime approval:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:overtime:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      await prisma.employeeOvertime.delete({ where: { id } })
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting overtime:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── LEAVE / PTO ──────────────────────────────────────────────────────────
  ipcMain.handle('employees:leave:add', async (_, { employeeId, type, startDate, endDate, days, reason, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end < start) return { success: false, message: 'End date cannot be before start date' }
      const record = await prisma.employeeLeave.create({
        data: {
          employeeId,
          type: type || 'annual',
          startDate: start,
          endDate: end,
          days: Number(days) || 0,
          reason: reason || null,
          status: 'pending',
        },
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'leave_requested', details: `${type || 'annual'} leave · ${Number(days) || 0} day(s)`, performedBy: performedBy ?? null },
      })
      return { success: true, leave: record }
    } catch (error: any) {
      log.error('Error adding leave:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:leave:setStatus', async (_, { id, status, approvedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      if (!['approved', 'rejected', 'pending'].includes(status)) return { success: false, message: 'Invalid status' }
      const leave = await prisma.employeeLeave.update({
        where: { id },
        data: { status, approvedBy: approvedBy ?? null, reviewedAt: new Date() },
      })
      // On approval, mark each calendar day of the leave as 'leave' attendance.
      // On any other status, take those rows back out again — otherwise rejecting
      // a request (or returning it to pending) left the holiday painted on the
      // attendance calendar for ever. We match on the note we wrote, so a day a
      // manager recorded as leave by hand is never touched.
      const rangeStart = new Date(leave.startDate); rangeStart.setUTCHours(0, 0, 0, 0)
      const rangeEnd   = new Date(leave.endDate);   rangeEnd.setUTCHours(0, 0, 0, 0)
      if (status === 'approved') {
        const cur = new Date(rangeStart)
        let guard = 0
        while (cur.getTime() <= rangeEnd.getTime() && guard < 400) {
          const day = new Date(cur)
          await prisma.employeeAttendance.upsert({
            where: { employeeId_date: { employeeId: leave.employeeId, date: day } },
            create: { employeeId: leave.employeeId, date: day, status: 'leave', notes: `${leave.type} leave` },
            update: { status: 'leave', notes: `${leave.type} leave` },
          })
          cur.setUTCDate(cur.getUTCDate() + 1)
          guard++
        }
      } else {
        const after = new Date(rangeEnd)
        after.setUTCDate(after.getUTCDate() + 1)
        await prisma.employeeAttendance.deleteMany({
          where: {
            employeeId: leave.employeeId,
            date: { gte: rangeStart, lt: after },
            status: 'leave',
            notes: `${leave.type} leave`,
          },
        })
      }
      await prisma.employeeActivityLog.create({
        data: { employeeId: leave.employeeId, action: `leave_${status}`, details: `${leave.type} leave ${status} (${leave.days} day(s))`, performedBy: approvedBy ?? null },
      })
      return { success: true, leave }
    } catch (error: any) {
      log.error('Error updating leave status:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:leave:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      await prisma.employeeLeave.delete({ where: { id } })
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting leave:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── ONBOARDING / OFFBOARDING CHECKLIST ───────────────────────────────────
  /**
   * The lifecycle lists.
   *
   * Onboarding and offboarding are the same shape of problem — a set of things
   * that must happen in order, some of which block everything else — so they
   * share one model and one set of handlers, separated by `phase`.
   */

  const CHECKLIST_PHASES = ['onboarding', 'offboarding']

  async function seedChecklist(
    employeeId: string,
    phase: 'onboarding' | 'offboarding',
    performedBy: string | null
  ): Promise<number> {
    if (!prisma) return 0
    const template = phase === 'onboarding' ? DEFAULT_ONBOARDING_TASKS : DEFAULT_OFFBOARDING_TASKS
    const existing = await prisma.employeeChecklistItem.findMany({
      where: { employeeId, phase },
      select: { title: true },
    })
    const have = new Set(existing.map((item: any) => item.title))
    const toCreate = template.filter((task) => !have.has(task.title))
    if (!toCreate.length) return 0

    await prisma.employeeChecklistItem.createMany({
      data: toCreate.map((task, index) => ({
        employeeId,
        phase,
        title: task.title,
        category: task.category,
        required: task.required,
        sortOrder: index,
      })),
    })

    await prisma.employeeActivityLog.create({
      data: {
        employeeId,
        action: `${phase}_checklist_created`,
        details: `${toCreate.length} ${phase} task(s) created`,
        performedBy,
      },
    })
    return toCreate.length
  }

  ipcMain.handle('employees:checklist:add', async (_, { employeeId, phase, title, category, required, dueDate, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const clean = String(title ?? '').trim()
      if (!employeeId || !clean) return { success: false, message: 'A task needs a title' }
      const next = await prisma.employeeChecklistItem.count({ where: { employeeId, phase: phase ?? 'onboarding' } })
      const item = await prisma.employeeChecklistItem.create({
        data: {
          employeeId,
          phase: CHECKLIST_PHASES.includes(phase) ? phase : 'onboarding',
          title: clean.slice(0, 200),
          category: String(category ?? 'other').slice(0, 40),
          required: required !== false,
          dueDate: dueDate ? new Date(dueDate) : null,
          sortOrder: next,
        },
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: 'checklist_item_added',
          details: `${item.phase} · ${item.title}`,
          performedBy: performedBy ?? null,
        },
      })
      return { success: true, item }
    } catch (error: any) {
      log.error('Error adding checklist item:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:checklist:toggle', async (_, { id, completed, performedBy, notes }: any) => {
    try {
      if (!prisma) return { success: false }
      const done = completed !== false
      const item = await prisma.employeeChecklistItem.update({
        where: { id },
        data: {
          completed: done,
          completedAt: done ? new Date() : null,
          completedBy: done ? (performedBy ?? null) : null,
          ...(notes !== undefined ? { notes: notes || null } : {}),
        },
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: item.employeeId,
          action: done ? 'checklist_item_done' : 'checklist_item_reopened',
          details: `${item.phase} · ${item.title}`,
          performedBy: performedBy ?? null,
        },
      })
      return { success: true, item }
    } catch (error: any) {
      log.error('Error updating checklist item:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:checklist:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      await prisma.employeeChecklistItem.delete({ where: { id } })
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting checklist item:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:onboarding:start', async (_, { employeeId, probationMonths, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const created = await seedChecklist(employeeId, 'onboarding', performedBy ?? null)

      // A probation end date is the one onboarding fact with a deadline attached,
      // so set it here rather than hoping someone remembers to.
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { hireDate: true, probationEndDate: true },
      })
      let probationEndDate = employee?.probationEndDate ?? null
      if (!probationEndDate && employee?.hireDate) {
        const months = Number.isFinite(Number(probationMonths)) ? Number(probationMonths) : 3
        const start = new Date(employee.hireDate)
        const end = new Date(start)
        end.setMonth(end.getMonth() + months)
        probationEndDate = end
        await prisma.employee.update({ where: { id: employeeId }, data: { probationEndDate: end } })
      }

      return { success: true, created, probationEndDate }
    } catch (error: any) {
      log.error('Error starting onboarding:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Begin offboarding: record the plan, then generate the exit checklist.
   *
   * Deliberately does NOT terminate the employee. Someone serving their notice is
   * still employed — their status only changes when offboarding is completed, so
   * the notice period stops being invisible.
   */
  ipcMain.handle('employees:offboarding:initiate', async (_, {
    employeeId, lastWorkingDate, exitReason, rehireEligible, exitInterviewNotes, performedBy,
  }: any) => {
    try {
      if (!prisma) return { success: false }
      if (!employeeId) return { success: false, message: 'Missing employee' }
      const lastDay = lastWorkingDate ? new Date(lastWorkingDate) : new Date()

      const employee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          lastWorkingDate: lastDay,
          exitReason: exitReason ? String(exitReason).slice(0, 60) : null,
          rehireEligible: typeof rehireEligible === 'boolean' ? rehireEligible : null,
          exitInterviewNotes: exitInterviewNotes ? String(exitInterviewNotes).slice(0, 4000) : null,
        },
      })

      const created = await seedChecklist(employeeId, 'offboarding', performedBy ?? null)

      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: 'offboarding_started',
          details: `Last working day ${lastDay.toISOString().slice(0, 10)}${exitReason ? ` · ${exitReason}` : ''} · ${created} task(s) created`,
          performedBy: performedBy ?? null,
        },
      })

      return { success: true, employee, created }
    } catch (error: any) {
      log.error('Error initiating offboarding:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Final settlement preview.
   *
   * Purely a calculation — nothing is written, so a manager can look at the
   * numbers, change their mind, and look again. The modal turns these figures
   * into a payroll record when (and only when) a human confirms them.
   */
  ipcMain.handle('employees:offboarding:settlement', async (_, {
    employeeId, gratuityMonthsPerYear, includeGratuity, additions, deductions,
  }: any) => {
    try {
      if (!prisma) return null
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) return null

      const year = new Date().getFullYear()
      const approvedAnnual = await prisma.employeeLeave.findMany({
        where: {
          employeeId,
          status: 'approved',
          type: 'annual',
          startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
        },
        select: { days: true },
      })
      const taken = approvedAnnual.reduce((sum: number, row: any) => sum + (row.days ?? 0), 0)
      const allowance = employee.annualLeaveDays ?? 21

      // Overtime already approved for the final month is money already earned.
      // Reuse the one pricing function so it cannot drift from payroll.
      const lastDay = new Date(employee.lastWorkingDate ?? new Date())
      const otPeriod = periodFromPayload({
        year: lastDay.getFullYear(),
        month: lastDay.getMonth() + 1,
      })
      const ot = await computeOvertimeForMonth(employeeId, otPeriod.start, otPeriod.end)

      const breakdown = computeSettlement({
        salary: employee.salary ?? 0,
        salaryType: employee.salaryType ?? 'monthly',
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString() : new Date().toISOString(),
        lastWorkingDate: lastDay.toISOString(),
        leaveRemainingDays: Math.max(0, allowance - taken),
        gratuityMonthsPerYear: Number(gratuityMonthsPerYear),
        includeGratuity: includeGratuity !== false,
        additions: Number(additions),
        deductions: Number(deductions),
        overtimePay: ot.overtimePay,
        overtimeHours: ot.overtimeHours,
      })

      return {
        ...breakdown,
        leaveAllowance: allowance,
        leaveTaken: taken,
        overtimeHours: ot.overtimeHours,
        overtimePay: ot.overtimePay,
      }
    } catch (error: any) {
      log.error('Error computing settlement:', error)
      return null
    }
  })

  /**
   * Finish offboarding: flip the status and stamp the exit.
   *
   * Refuses while required checklist items are outstanding — the whole point of
   * the list is that a leaver does not walk out still holding a laptop and a live
   * login. `force` exists for the real world, and is recorded when used.
   */
  ipcMain.handle('employees:offboarding:complete', async (_, { employeeId, performedBy, force }: any) => {
    try {
      if (!prisma) return { success: false }
      const outstanding = await prisma.employeeChecklistItem.findMany({
        where: { employeeId, phase: 'offboarding', required: true, completed: false },
        select: { title: true },
      })
      if (outstanding.length && force !== true) {
        return {
          success: false,
          code: 'OUTSTANDING_TASKS',
          outstanding: outstanding.map((item: any) => item.title),
          message: `${outstanding.length} required task(s) are still open`,
        }
      }

      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      const exitDate = employee?.lastWorkingDate ?? new Date()

      const updated = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          status: 'terminated',
          terminationDate: exitDate,
          terminationNote: employee?.exitReason ?? 'Offboarded',
        },
      })

      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: 'offboarding_completed',
          details: `Offboarding closed on ${new Date(exitDate).toISOString().slice(0, 10)}${
            force === true && outstanding.length ? ` · forced with ${outstanding.length} open task(s)` : ''
          }`,
          performedBy: performedBy ?? null,
        },
      })

      return { success: true, employee: updated, forced: force === true && outstanding.length > 0 }
    } catch (error: any) {
      log.error('Error completing offboarding:', error)
      return { success: false, message: error.message }
    }
  })

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  /**
   * Normalises the optional renewal fields shared by add/update.
   *
   * Returns either the values to write or the reason they are invalid. The
   * reason is a stable `code` so the renderer can show it in the user's own
   * language instead of relaying this process's English.
   */
  function readDocumentRenewalFields(input: any): { ok: true; data: any } | { ok: false; code: string; message: string } {
    const reference = input?.reference ? String(input.reference).trim().slice(0, 120) : null
    const parseDate = (value: any): Date | null => {
      if (!value) return null
      const d = new Date(value)
      return isNaN(d.getTime()) ? null : d
    }
    const issuedAt = parseDate(input?.issuedAt)
    const expiresAt = parseDate(input?.expiresAt)
    if (input?.expiresAt && !expiresAt) return { ok: false, code: 'invalid_expiry', message: 'The expiry date is not a valid date' }
    if (input?.issuedAt && !issuedAt) return { ok: false, code: 'invalid_issue', message: 'The issue date is not a valid date' }
    if (issuedAt && expiresAt && expiresAt <= issuedAt) {
      return { ok: false, code: 'expiry_before_issue', message: 'The expiry date must be after the issue date' }
    }
    return { ok: true, data: { reference, issuedAt, expiresAt } }
  }

  // Prompts the user for a file, copies it into userData/employee-documents and
  // records the metadata.
  // { employeeId, title, type, reference, issuedAt, expiresAt, performedBy }
  ipcMain.handle('employees:documents:add', async (_, { employeeId, title, type, performedBy, ...rest }: any) => {
    try {
      if (!prisma) return { success: false }

      const renewal = readDocumentRenewalFields(rest)
      if (!renewal.ok) return { success: false, code: renewal.code, message: renewal.message }

      const picked = await dialog.showOpenDialog({
        title: 'Select document to attach',
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt', 'xlsx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (picked.canceled || !picked.filePaths[0]) {
        return { success: false, message: 'No file selected', canceled: true }
      }

      const src = picked.filePaths[0]
      const ext = path.extname(src)
      const empDir = path.join(employeeDocsDir(), employeeId)
      fs.mkdirSync(empDir, { recursive: true })
      const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
      const dest = path.join(empDir, storedName)
      fs.copyFileSync(src, dest)

      const record = await prisma.employeeDocument.create({
        data: {
          employeeId,
          title: (title && String(title).trim()) || path.basename(src),
          type: type || 'other',
          filename: path.join(employeeId, storedName),
          ...renewal.data,
        },
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'document_added', details: `Document "${record.title}" (${record.type})`, performedBy: performedBy ?? null },
      })
      return { success: true, document: record }
    } catch (error: any) {
      log.error('Error adding document:', error)
      return { success: false, message: error.message }
    }
  })

  // Edits the metadata of an already-attached document. Replacing the file is
  // deliberately not supported here — attach again and delete the old record,
  // so the audit trail keeps pointing at a file that still exists.
  ipcMain.handle('employees:documents:update', async (_, { id, title, type, performedBy, ...rest }: any) => {
    try {
      if (!prisma) return { success: false }
      const existing = await prisma.employeeDocument.findUnique({ where: { id } })
      if (!existing) return { success: false, message: 'Document not found' }

      const renewal = readDocumentRenewalFields(rest)
      if (!renewal.ok) return { success: false, code: renewal.code, message: renewal.message }

      const record = await prisma.employeeDocument.update({
        where: { id },
        data: {
          title: (title && String(title).trim()) || existing.title,
          type: type || existing.type,
          ...renewal.data,
        },
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: existing.employeeId,
          action: 'document_updated',
          details: `Document "${record.title}" (${record.type}) updated`,
          performedBy: performedBy ?? null,
        },
      })
      return { success: true, document: record }
    } catch (error: any) {
      log.error('Error updating document:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:documents:open', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      const doc = await prisma.employeeDocument.findUnique({ where: { id } })
      if (!doc) return { success: false, message: 'Document not found' }
      const full = path.join(employeeDocsDir(), doc.filename)
      if (!fs.existsSync(full)) return { success: false, message: 'File is missing on disk' }
      const err = await shell.openPath(full)
      if (err) return { success: false, message: err }
      return { success: true }
    } catch (error: any) {
      log.error('Error opening document:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:documents:delete', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      const doc = await prisma.employeeDocument.findUnique({ where: { id } })
      if (!doc) return { success: false, message: 'Document not found' }
      const full = path.join(employeeDocsDir(), doc.filename)
      try { if (fs.existsSync(full)) fs.unlinkSync(full) } catch { /* ignore missing file */ }
      await prisma.employeeDocument.delete({ where: { id } })
      return { success: true }
    } catch (error: any) {
      log.error('Error deleting document:', error)
      return { success: false, message: error.message }
    }
  })
}


