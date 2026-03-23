/**
 * Clinic Staff & Salary IPC Handlers
 *
 * Manages clinic staff profiles (doctors, nurses, receptionists…) and their
 * monthly salary records.  Supports full-time, part-time and contract
 * employment types, with overtime and double-shift bonuses.
 *
 * Endpoints:
 *   clinic:staff:getAll                – list all staff
 *   clinic:staff:create                – create staff member
 *   clinic:staff:update                – update staff member
 *   clinic:staff:delete                – delete staff member (cascades salary records)
 *
 *   clinic:staff:salary:getAll         – list salary records (filter by staffId, year)
 *   clinic:staff:salary:compute        – compute breakdown without saving (dry-run)
 *   clinic:staff:salary:upsert         – save/update a month's salary record
 *   clinic:staff:salary:markPaid       – set record status=paid and stamp paidDate
 *   clinic:staff:salary:delete         – delete one salary record
 *   clinic:staff:salary:summary        – total salary cost per month for a given year
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:Staff')

// ─── Salary computation logic ─────────────────────────────────────────────────
//
// Rules:
//   full_time / monthly  →  baseSalary is the fixed monthly amount
//                           overtime   = overtimeHours × hourlyRate × overtimeMultiplier
//   part_time / hourly   →  basePay    = regularHours × hourlyRate
//                           overtime   = overtimeHours × hourlyRate × overtimeMultiplier
//   contract / daily     →  basePay    = regularHours × baseSalary   (baseSalary = daily rate)
//                           overtime handled via hourlyRate if provided
//
//   double_shift bonus   →  doubleShiftCount × doubleShiftBonus  (flat per shift)
//
// netPay = basePay + overtimePay + doubleShiftPay + bonuses − deductions

interface SalaryParams {
  regularHours?: number
  overtimeHours?: number
  overtimeMultiplier?: number   // override staff default (e.g. for a special agreement)
  doubleShiftCount?: number
  doubleShiftBonus?: number     // override staff default
  bonuses?: number
  deductions?: number
}

interface SalaryBreakdown {
  basePay: number
  overtimePay: number
  doubleShiftPay: number
  bonuses: number
  deductions: number
  grossPay: number
  netPay: number
}

function computeNetPay(staff: any, params: SalaryParams): SalaryBreakdown {
  const {
    regularHours     = 0,
    overtimeHours    = 0,
    overtimeMultiplier = staff.overtimeRate ?? 1.5,
    doubleShiftCount = 0,
    doubleShiftBonus = staff.doubleShiftRate ?? 0,
    bonuses          = 0,
    deductions       = 0
  } = params

  let basePay = 0

  if (staff.salaryType === 'monthly') {
    // Full-time fixed monthly — base is the contracted monthly amount
    basePay = staff.baseSalary ?? 0
  } else if (staff.salaryType === 'hourly') {
    // Part-time — pay only for hours actually worked
    basePay = regularHours * (staff.hourlyRate ?? 0)
  } else if (staff.salaryType === 'daily') {
    // Contract — baseSalary stores the daily rate; regularHours = days worked
    basePay = regularHours * (staff.baseSalary ?? 0)
  } else {
    basePay = staff.baseSalary ?? 0
  }

  // Overtime always uses hourlyRate as the base unit
  const hourlyBase = staff.hourlyRate ?? (staff.baseSalary / 160) // fallback: monthly÷160h
  const overtimePay = overtimeHours * hourlyBase * overtimeMultiplier

  // Double-shift: flat bonus per extra shift worked
  const doubleShiftPay = doubleShiftCount * doubleShiftBonus

  const grossPay = basePay + overtimePay + doubleShiftPay + bonuses
  const netPay   = Math.max(0, grossPay - deductions)

  return {
    basePay:        Math.round(basePay        * 100) / 100,
    overtimePay:    Math.round(overtimePay    * 100) / 100,
    doubleShiftPay: Math.round(doubleShiftPay * 100) / 100,
    bonuses:        Math.round(bonuses        * 100) / 100,
    deductions:     Math.round(deductions     * 100) / 100,
    grossPay:       Math.round(grossPay       * 100) / 100,
    netPay:         Math.round(netPay         * 100) / 100
  }
}

export function registerClinicStaffHandlers(prisma: any) {
  // ─── STAFF CRUD ────────────────────────────────────────────────────────────
  ipcMain.handle('clinic:staff:getAll', async () => {
    try {
      if (!prisma) return []
      return await prisma.clinicStaff.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { salaryRecords: true } } }
      })
    } catch (error) {
      log.error('Error fetching staff:', error)
      throw error
    }
  })

  ipcMain.handle('clinic:staff:create', async (_, data: any) => {
    try {
      if (!prisma) throw new Error('Database not available')
      return await prisma.clinicStaff.create({ data })
    } catch (error) {
      log.error('Error creating staff:', error)
      throw error
    }
  })

  ipcMain.handle('clinic:staff:update', async (_, { id, data }: { id: string; data: any }) => {
    try {
      if (!prisma) throw new Error('Database not available')
      return await prisma.clinicStaff.update({ where: { id }, data })
    } catch (error) {
      log.error('Error updating staff:', error)
      throw error
    }
  })

  ipcMain.handle('clinic:staff:delete', async (_, id: string) => {
    try {
      if (!prisma) throw new Error('Database not available')
      // Cascades to ClinicSalaryRecord via schema relation
      await prisma.clinicStaff.delete({ where: { id } })
      return { success: true }
    } catch (error) {
      log.error('Error deleting staff:', error)
      throw error
    }
  })

  // ─── SALARY RECORDS ────────────────────────────────────────────────────────
  ipcMain.handle('clinic:staff:salary:getAll', async (_, params?: { staffId?: string; year?: number }) => {
    try {
      if (!prisma) return []
      const where: any = {}
      if (params?.staffId) where.staffId = params.staffId
      if (params?.year) where.year = params.year

      return await prisma.clinicSalaryRecord.findMany({
        where,
        include: {
          staff: { select: { id: true, name: true, role: true, employmentType: true, salaryType: true } }
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      })
    } catch (error) {
      log.error('Error fetching salary records:', error)
      throw error
    }
  })

  // Upsert — create or update the record for (staffId, month, year)
  ipcMain.handle('clinic:staff:salary:upsert', async (_, payload: any) => {
    try {
      if (!prisma) throw new Error('Database not available')
      const { staffId, month, year, ...rest } = payload

      // If netPay is not pre-computed by caller, compute it server-side
      if (rest.netPay === undefined || rest.netPay === null) {
        const staff = await prisma.clinicStaff.findUnique({ where: { id: staffId } })
        if (!staff) throw new Error(`Staff ${staffId} not found`)
        const breakdown = computeNetPay(staff, rest)
        rest.netPay = breakdown.netPay
      }

      return await prisma.clinicSalaryRecord.upsert({
        where: { staffId_month_year: { staffId, month, year } },
        update: rest,
        create: { staffId, month, year, ...rest }
      })
    } catch (error) {
      log.error('Error upserting salary record:', error)
      throw error
    }
  })

  // Dry-run compute — returns the full breakdown without touching the DB.
  // Useful for live-preview in the salary form.
  ipcMain.handle('clinic:staff:salary:compute', async (_, { staffId, params }: { staffId: string; params: SalaryParams }) => {
    try {
      if (!prisma) throw new Error('Database not available')
      const staff = await prisma.clinicStaff.findUnique({ where: { id: staffId } })
      if (!staff) throw new Error(`Staff ${staffId} not found`)
      return computeNetPay(staff, params)
    } catch (error) {
      log.error('Error computing salary:', error)
      throw error
    }
  })

  // Mark a salary record as paid
  ipcMain.handle('clinic:staff:salary:markPaid', async (_, id: string) => {
    try {
      if (!prisma) throw new Error('Database not available')
      return await prisma.clinicSalaryRecord.update({
        where: { id },
        data: { status: 'paid', paidDate: new Date() }
      })
    } catch (error) {
      log.error('Error marking salary paid:', error)
      throw error
    }
  })

  ipcMain.handle('clinic:staff:salary:delete', async (_, id: string) => {
    try {
      if (!prisma) throw new Error('Database not available')
      await prisma.clinicSalaryRecord.delete({ where: { id } })
      return { success: true }
    } catch (error) {
      log.error('Error deleting salary record:', error)
      throw error
    }
  })

  // ─── SALARY SUMMARY ────────────────────────────────────────────────────────
  // Returns total salary cost per month for a given year, split by status
  // (pending vs paid).  Used for the finance overview chart.
  //
  // Response shape:
  //   [{ month: 1..12, label: 'Jan', totalPaid, totalPending, headcount }, …]
  ipcMain.handle('clinic:staff:salary:summary', async (_, year?: number) => {
    try {
      if (!prisma) return []
      const targetYear = year ?? new Date().getFullYear()

      const records: { month: number; netPay: number; status: string }[] =
        await prisma.clinicSalaryRecord.findMany({
          where: { year: targetYear },
          select: { month: true, netPay: true, status: true }
        })

      const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const buckets = MONTH_ABBR.map((label, i) => ({
        month: i + 1,
        label,
        totalPaid:    0,
        totalPending: 0,
        headcount:    0
      }))

      for (const r of records) {
        const b = buckets[r.month - 1]
        if (!b) continue
        b.headcount++
        if (r.status === 'paid') b.totalPaid    += r.netPay
        else                     b.totalPending += r.netPay
      }

      // Round all floats
      return buckets.map((b) => ({
        ...b,
        totalPaid:    Math.round(b.totalPaid    * 100) / 100,
        totalPending: Math.round(b.totalPending * 100) / 100
      }))
    } catch (error) {
      log.error('Error building salary summary:', error)
      throw error
    }
  })
}
