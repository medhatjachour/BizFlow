import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Expenses')

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (period) {
    case 'today':  start.setHours(0, 0, 0, 0); break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':  start.setDate(1); start.setHours(0, 0, 0, 0); break
    case 'year':   start.setMonth(0, 1); start.setHours(0, 0, 0, 0); break
    default:       start.setDate(1); start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

export function registerGymExpenseHandlers(prisma: any) {
  ipcMain.handle('gym:expenses:getAll', async (_e, params?: { period?: string; category?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.period) {
        const { start, end } = getPeriodRange(params.period)
        where.date = { gte: start, lt: end }
      }
      if (params?.category && params.category !== 'all') where.category = params.category
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50
      const [data, total] = await Promise.all([
        prisma.gymExpense.findMany({ where, orderBy: { date: 'desc' }, skip, take }),
        prisma.gymExpense.count({ where })
      ])
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:expenses:summary', async (_e, period = 'month') => {
    try {
      const { start, end } = getPeriodRange(period)
      const rows = await prisma.gymExpense.findMany({
        where: { date: { gte: start, lt: end } },
        select: { amount: true, category: true }
      })
      const totalExpenses = rows.reduce((s: number, e: any) => s + e.amount, 0)
      const catMap: Record<string, number> = {}
      for (const e of rows) catMap[e.category] = (catMap[e.category] ?? 0) + e.amount
      const byCategory = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
      return { totalExpenses, byCategory }
    } catch (err) { log.error('summary', err); throw err }
  })

  ipcMain.handle('gym:expenses:create', async (_e, data: any) => {
    try {
      return prisma.gymExpense.create({ data: { ...data, date: new Date(data.date) } })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:expenses:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      return prisma.gymExpense.update({ where: { id }, data: { ...data, date: data.date ? new Date(data.date) : undefined } })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:expenses:delete', async (_e, id: string) => {
    try {
      await prisma.gymExpense.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
