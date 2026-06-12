/**
 * Vet Expenses IPC Handlers
 *
 * Endpoints:
 *   vet:expenses:getAll      – list expenses with optional period/category filter
 *   vet:expenses:summary     – KPI totals (revenue, expenses, netIncome, outstanding, byCategory)
 *   vet:expenses:breakdown   – time-bucketed spend series
 *   vet:expenses:create      – create one expense record
 *   vet:expenses:update      – update one expense record
 *   vet:expenses:delete      – delete one expense record
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Expenses')

type Period = 'today' | 'week' | 'month' | 'year' | string

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now   = new Date()
  const start = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

export function registerVetExpenseHandlers(prisma: any) {
  // ─── Get All ──────────────────────────────────────────────────────────────
  ipcMain.handle('vet:expenses:getAll', async (_e, params?: {
    period?: Period; category?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.category && params.category !== 'all') where.category = params.category
      if (params?.period) {
        const { start, end } = getPeriodRange(params.period)
        where.date = { gte: start, lt: end }
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetExpense.count({ where })
      const data  = await prisma.vetExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Summary ──────────────────────────────────────────────────────────────
  ipcMain.handle('vet:expenses:summary', async (_e, period?: Period) => {
    try {
      const { start, end } = getPeriodRange(period ?? 'month')

      const [sessionRows, expenseRows, outstandingRows] = await Promise.all([
        prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(amountCharged),0) as revenue, COALESCE(SUM(amountPaid),0) as collected
          FROM VetSession WHERE visitDate >= ? AND visitDate < ?
        `, start, end) as Promise<any[]>,
        prisma.$queryRawUnsafe(`
          SELECT category, COALESCE(SUM(amount),0) as total
          FROM VetExpense WHERE date >= ? AND date < ?
          GROUP BY category
        `, start, end) as Promise<any[]>,
        prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(amountCharged),0) - COALESCE(SUM(amountPaid),0) as outstanding
          FROM VetSession WHERE paymentStatus NOT IN ('paid','waived')
        `) as Promise<any[]>
      ])

      const revenue      = Number(sessionRows[0]?.revenue)    || 0
      const collected    = Number(sessionRows[0]?.collected)   || 0
      const totalExpenses = expenseRows.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0)
      const byCategory: Record<string, number> = {}
      for (const r of expenseRows) byCategory[r.category] = Number(r.total) || 0

      return {
        revenue,
        collected,
        totalExpenses,
        netIncome:   collected - totalExpenses,
        outstanding: Number(outstandingRows[0]?.outstanding) || 0,
        byCategory
      }
    } catch (err) { log.error('summary', err); throw err }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:expenses:create', async (_e, data: any) => {
    try { return await prisma.vetExpense.create({ data }) }
    catch (err) { log.error('create', err); throw err }
  })

  // ─── Update ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:expenses:update', async (_e, id: string, data: any) => {
    try { return await prisma.vetExpense.update({ where: { id }, data }) }
    catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete ───────────────────────────────────────────────────────────────
  ipcMain.handle('vet:expenses:delete', async (_e, id: string) => {
    try { return await prisma.vetExpense.delete({ where: { id } }) }
    catch (err) { log.error('delete', err); throw err }
  })
}
