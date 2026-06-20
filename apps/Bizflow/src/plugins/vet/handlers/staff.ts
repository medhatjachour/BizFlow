import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Staff')

export function registerVetStaffHandlers(prisma: any) {
  // ─── Get All Staff ────────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:getAll', async (_e, params?: {
    search?: string; status?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.status && params.status !== 'all') where.status = params.status
      if (params?.search) {
        where.OR = [
          { name: { contains: params.search } },
          { phone: { contains: params.search } }
        ]
      }
      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 40
      const total = await prisma.vetStaff.count({ where })
      const data  = await prisma.vetStaff.findMany({
        where,
        include: {
          _count: { select: { salaryRecords: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Get by ID ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:getById', async (_e, id: string) => {
    try {
      return await prisma.vetStaff.findUnique({
        where: { id },
        include: { salaryRecords: { orderBy: [{ year: 'desc' }, { month: 'desc' }] } }
      })
    } catch (err) { log.error('getById', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:create', async (_e, data: any) => {
    try {
      return await prisma.vetStaff.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetStaff.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:delete', async (_e, id: string) => {
    try {
      return await prisma.vetStaff.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })

  // ─── Salary: Get Records ──────────────────────────────────────────────────
  ipcMain.handle('vet:staff:salary:getRecords', async (_e, staffId: string) => {
    try {
      return await prisma.vetSalaryRecord.findMany({
        where: { staffId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      })
    } catch (err) { log.error('salary:getRecords', err); throw err }
  })

  // ─── Salary: Upsert ───────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:salary:upsert', async (_e, data: any) => {
    try {
      const { staffId, month, year, ...rest } = data
      const netPay = (rest.baseSalary ?? 0)
        + (rest.regularHours ?? 0) * 0
        + (rest.overtimeHours ?? 0) * (rest.overtimeRate ?? 0) * (rest.overtimeMultiplier ?? 1.5)
        + (rest.doubleShiftCount ?? 0) * (rest.doubleShiftBonus ?? 0)
        + (rest.bonuses ?? 0)
        - (rest.deductions ?? 0)

      return await prisma.vetSalaryRecord.upsert({
        where: { staffId_month_year: { staffId, month, year } },
        update: { ...rest, netPay },
        create: { staffId, month, year, ...rest, netPay }
      })
    } catch (err) { log.error('salary:upsert', err); throw err }
  })

  // ─── Salary: Delete ───────────────────────────────────────────────────────
  ipcMain.handle('vet:staff:salary:delete', async (_e, id: string) => {
    try {
      return await prisma.vetSalaryRecord.delete({ where: { id } })
    } catch (err) { log.error('salary:delete', err); throw err }
  })
}
