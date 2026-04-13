/**
 * Employees IPC Handlers
 * Full employee lifecycle: profile, attendance, documents, activity log, payroll
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Employees')

// Shared include for full employee profile
const EMPLOYEE_INCLUDE = {
  attendance: { orderBy: { date: 'desc' as const }, take: 90 },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
  activityLogs: { orderBy: { createdAt: 'desc' as const }, take: 50 },
  payrollRecords: { orderBy: [{ year: 'desc' as const }, { month: 'desc' as const }], take: 24 },
  shifts: { orderBy: { date: 'desc' as const }, take: 60 },
  overtimeRecords: { orderBy: { date: 'desc' as const }, take: 60 }
}

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

export function registerEmployeesHandlers(prisma: any) {
  // ─── LIST ─────────────────────────────────────────────────────────────────
  ipcMain.handle('employees:getAll', async () => {
    try {
      if (!prisma) return []
      return await prisma.employee.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { attendance: true, activityLogs: true } }
        }
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
        attendanceSummary: computeAttendanceSummary(emp.attendance)
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
      const employee = await prisma.employee.create({ data: employeeData })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: employee.id,
          action: 'employee_created',
          details: `Employee profile created`,
          performedBy: employeeData.createdBy ?? null
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
      const employee = await prisma.employee.update({ where: { id }, data })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: id,
          action: 'profile_updated',
          details: `Profile fields updated: ${Object.keys(data).join(', ')}`,
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
  ipcMain.handle('employees:attendance:upsert', async (_, { employeeId, date, status, checkIn, checkOut, notes }: any) => {
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
          performedBy: null
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

      const record = await prisma.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId, date: dayStart } },
        create: { employeeId, date: dayStart, status: 'present', checkIn: now },
        update: { checkIn: now, status: 'present' }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId, action: 'checked_in', details: `Checked in at ${now.toLocaleTimeString()}` }
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

  /** Auto-compute overtime pay from approved EmployeeOvertime records for a given month/year. */
  async function computeOvertimeForMonth(employeeId: string, month: number, year: number, baseSalary: number) {
    if (!prisma) return { overtimeHours: 0, overtimePay: 0 }
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd   = new Date(year, month,     1)
    const records = await prisma.employeeOvertime.findMany({
      where: { employeeId, date: { gte: monthStart, lt: monthEnd } }
    })
    const overtimeHours: number = records.reduce((s: number, r: any) => s + (r.hours ?? 0), 0)
    // Derive hourly rate: monthly salary / 160 standard hours
    const hourlyRate = baseSalary > 0 ? baseSalary / 160 : 0
    const overtimePay: number = records.reduce(
      (s: number, r: any) => s + (r.hours ?? 0) * hourlyRate * (r.multiplier ?? 1.5),
      0
    )
    return { overtimeHours, overtimePay }
  }

  /** Count extra/double shifts from EmployeeShift records for the month. */
  async function countExtraShiftsForMonth(employeeId: string, month: number, year: number) {
    if (!prisma) return 0
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd   = new Date(year, month,     1)
    const shifts = await prisma.employeeShift.findMany({
      where: { employeeId, date: { gte: monthStart, lt: monthEnd } }
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

  ipcMain.handle('employees:payroll:upsert', async (_, {
    employeeId, month, year,
    baseSalary,
    regularHours,
    overtimeHours, overtimePay,
    extraShifts, extraShiftPay, extraShiftBonusPerShift,
    bonuses, deductions,
    notes, status, paidDate, performedBy,
  }: any) => {
    try {
      if (!prisma) return { success: false }

      const base = baseSalary ?? 0
      const bon  = bonuses    ?? 0
      const ded  = deductions ?? 0

      // Auto-compute overtime from EmployeeOvertime records if not provided
      let otHours = overtimeHours ?? null
      let otPay   = overtimePay   ?? null
      if (otPay == null) {
        const ot = await computeOvertimeForMonth(employeeId, month, year, base)
        otHours = ot.overtimeHours
        otPay   = ot.overtimePay
      }

      // Auto-compute extra shifts if not provided
      let xShifts = extraShifts   ?? null
      let xPay    = extraShiftPay ?? null
      if (xPay == null) {
        xShifts = await countExtraShiftsForMonth(employeeId, month, year)
        const bonusPerShift = extraShiftBonusPerShift ?? 0
        xPay = (xShifts as number) * bonusPerShift
      }

      const grossPay = base + (otPay as number) + (xPay as number) + bon
      const netPay   = grossPay - ded

      const data = {
        baseSalary: base,
        regularHours: regularHours ?? 0,
        overtimeHours: otHours as number,
        overtimePay:   otPay   as number,
        extraShifts:   xShifts as number,
        extraShiftPay: xPay    as number,
        bonuses: bon,
        deductions: ded,
        grossPay,
        netPay,
        status: status ?? 'pending',
        notes: notes ?? null,
        paidDate: paidDate ? new Date(paidDate) : null,
      }

      const record = await prisma.employeePayroll.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        create: { employeeId, month, year, ...data },
        update: data,
      })

      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: status === 'paid' ? 'payroll_paid' : 'payroll_updated',
          details: `Payroll ${month}/${year}: base $${base.toFixed(2)}, OT $${(otPay as number).toFixed(2)}, extra-shifts $${(xPay as number).toFixed(2)}, net $${netPay.toFixed(2)}`,
          performedBy: performedBy ?? null,
        }
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error upserting payroll:', error)
      return { success: false, message: error.message }
    }
  })

  /** Dry-run: compute full payroll breakdown without saving. */
  ipcMain.handle('employees:payroll:compute', async (_, { employeeId, month, year, baseSalary, extraShiftBonusPerShift }: any) => {
    try {
      if (!prisma) return null
      const base = baseSalary ?? 0
      const [ot, xShifts] = await Promise.all([
        computeOvertimeForMonth(employeeId, month, year, base),
        countExtraShiftsForMonth(employeeId, month, year),
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

  ipcMain.handle('employees:payroll:markPaid', async (_, id: string) => {
    try {
      if (!prisma) return { success: false }
      const record = await prisma.employeePayroll.update({
        where: { id },
        data: { status: 'paid', paidDate: new Date() },
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId: record.employeeId,
          action: 'payroll_paid',
          details: `Payroll ${record.month}/${record.year} marked as paid`,
          performedBy: null,
        },
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error marking payroll as paid:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * getSummary — aggregates payroll records across a range of months/years.
   * Returns per-employee breakdown totals plus an overall grand total.
   */
  ipcMain.handle('employees:payroll:getSummary', async (_, { startYear, startMonth, endYear, endMonth }: { startYear: number; startMonth: number; endYear: number; endMonth: number }) => {
    try {
      if (!prisma) return { employees: [], totals: {} }

      // Build a filter that captures all months in the range
      const records = await prisma.employeePayroll.findMany({
        where: {
          OR: [
            // entirely inside single year
            ...(startYear === endYear
              ? [{ year: startYear, month: { gte: startMonth, lte: endMonth } }]
              : [
                  { year: startYear, month: { gte: startMonth } },
                  { year: { gt: startYear, lt: endYear } },
                  { year: endYear,   month: { lte: endMonth } },
                ])
          ]
        },
        include: { employee: { select: { id: true, name: true, role: true, department: true } } },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
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

  ipcMain.handle('employees:overtime:approve', async (_, { id, approvedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const ot = await prisma.employeeOvertime.update({
        where: { id },
        data: { approved: true, approvedBy: approvedBy ?? null }
      })
      await prisma.employeeActivityLog.create({
        data: { employeeId: ot.employeeId, action: 'overtime_approved', details: `${ot.hours}h overtime approved`, performedBy: approvedBy ?? null }
      })
      return { success: true, overtime: ot }
    } catch (error: any) {
      log.error('Error approving overtime:', error)
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
}

