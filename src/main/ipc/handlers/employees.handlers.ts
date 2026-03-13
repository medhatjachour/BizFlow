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
  ipcMain.handle('employees:payroll:upsert', async (_, { employeeId, month, year, baseSalary, bonuses, deductions, notes, status, paidDate, performedBy }: any) => {
    try {
      if (!prisma) return { success: false }
      const netPay = (baseSalary ?? 0) + (bonuses ?? 0) - (deductions ?? 0)
      const record = await prisma.employeePayroll.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        create: { employeeId, month, year, baseSalary, bonuses: bonuses ?? 0, deductions: deductions ?? 0, netPay, status: status ?? 'pending', notes, paidDate: paidDate ? new Date(paidDate) : null },
        update: { baseSalary, bonuses: bonuses ?? 0, deductions: deductions ?? 0, netPay, status, notes, paidDate: paidDate ? new Date(paidDate) : null }
      })
      await prisma.employeeActivityLog.create({
        data: {
          employeeId,
          action: status === 'paid' ? 'payroll_paid' : 'payroll_updated',
          details: `Payroll ${month}/${year}: net $${netPay.toFixed(2)}`,
          performedBy: performedBy ?? null
        }
      })
      return { success: true, record }
    } catch (error: any) {
      log.error('Error upserting payroll:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:payroll:getAll', async (_, { year }: { year: number }) => {
    try {
      if (!prisma) return []
      return await prisma.employeePayroll.findMany({
        where: { year },
        include: { employee: { select: { id: true, name: true, role: true, department: true } } },
        orderBy: [{ month: 'desc' }, { employee: { name: 'asc' } }]
      })
    } catch (error) {
      log.error('Error fetching payroll:', error)
      return []
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

