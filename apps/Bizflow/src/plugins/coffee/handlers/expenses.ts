import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Expenses')

function withDateRange(field: string, opts?: { startDate?: string; endDate?: string }) {
  const where: any = {}
  if (opts?.startDate || opts?.endDate) {
    where[field] = {}
    if (opts.startDate) where[field].gte = new Date(opts.startDate)
    if (opts.endDate) where[field].lte = new Date(opts.endDate)
  }
  return where
}

function buildWhere(opts?: {
  startDate?: string
  endDate?: string
  category?: string
  paymentMethod?: string
  shiftId?: string
  search?: string
}) {
  const where: any = { ...withDateRange('date', opts) }
  if (opts?.category && opts.category !== 'all') where.category = opts.category
  if (opts?.paymentMethod && opts.paymentMethod !== 'all') where.paymentMethod = opts.paymentMethod
  if (opts?.shiftId && opts.shiftId !== 'all') where.shiftId = opts.shiftId
 // FIX: Removed mode: 'insensitive' because SQLite doesn't support it
  if (opts?.search?.trim()) {
    const q = opts.search.trim()
    where.OR = [
      { description: { contains: q } },
      { vendor: { contains: q } },
      { notes: { contains: q } }
    ]
  }
  return where
}

export function registerExpenseHandlers(prisma: any) {
  ipcMain.handle('coffee:expenses:getAll', async (_e, opts?: {
    startDate?: string
    endDate?: string
    category?: string
    paymentMethod?: string
    shiftId?: string
    search?: string
    page?: number
    pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 25
      const where = buildWhere(opts)
      const [total, items] = await Promise.all([
        prisma.coffeeExpense.count({ where }),
        prisma.coffeeExpense.findMany({
          where,
          include: {
            shift: { select: { id: true, openedAt: true, closedAt: true, cashier: { select: { id: true, username: true, fullName: true } } } }
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('expenses:getAll', err)
      throw err
    }
  })

  ipcMain.handle('coffee:expenses:getSummary', async (_e, opts?: {
    startDate?: string
    endDate?: string
    category?: string
    paymentMethod?: string
    shiftId?: string
  }) => {
    try {
      const where = buildWhere(opts)
      const rows = await prisma.coffeeExpense.findMany({
        where,
        select: { amount: true, category: true, paymentMethod: true, shiftId: true }
      })

      const totalExpenses = rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
      const byCategoryMap = new Map<string, number>()
      const byPaymentMap = new Map<string, number>()
      let linkedToShifts = 0
      let unlinkedExpenses = 0

      for (const row of rows) {
        byCategoryMap.set(row.category, (byCategoryMap.get(row.category) ?? 0) + Number(row.amount || 0))
        byPaymentMap.set(row.paymentMethod, (byPaymentMap.get(row.paymentMethod) ?? 0) + Number(row.amount || 0))
        if (row.shiftId) linkedToShifts += Number(row.amount || 0)
        else unlinkedExpenses += Number(row.amount || 0)
      }

      return {
        totalExpenses,
        expenseCount: rows.length,
        averageExpense: rows.length > 0 ? totalExpenses / rows.length : 0,
        linkedToShifts,
        unlinkedExpenses,
        byCategory: Array.from(byCategoryMap.entries())
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total),
        byPaymentMethod: Array.from(byPaymentMap.entries())
          .map(([paymentMethod, total]) => ({ paymentMethod, total }))
          .sort((a, b) => b.total - a.total)
      }
    } catch (err) {
      log.error('expenses:getSummary', err)
      throw err
    }
  })

  ipcMain.handle('coffee:expenses:create', async (_e, data: {
    date?: string
    category?: string
    description: string
    amount: number
    vendor?: string
    paymentMethod?: string
    recurrence?: string
    shiftId?: string | null
    notes?: string
  }) => {
    try {
      return await prisma.coffeeExpense.create({
        data: {
          date: data.date ? new Date(data.date) : new Date(),
          category: data.category ?? 'other',
          description: data.description,
          amount: Number(data.amount),
          vendor: data.vendor || null,
          paymentMethod: data.paymentMethod ?? 'cash',
          recurrence: data.recurrence ?? 'one_time',
          shiftId: data.shiftId || null,
          notes: data.notes || null
        },
        include: {
          shift: { select: { id: true, openedAt: true, closedAt: true, cashier: { select: { id: true, username: true, fullName: true } } } }
        }
      })
    } catch (err) {
      log.error('expenses:create', err)
      throw err
    }
  })

  ipcMain.handle('coffee:expenses:update', async (_e, id: string, data: any) => {
    try {
      const { date, ...rest } = data || {}
      return await prisma.coffeeExpense.update({
        where: { id },
        data: {
          ...rest,
          ...(date ? { date: new Date(date) } : {})
        }
      })
    } catch (err) {
      log.error('expenses:update', err)
      throw err
    }
  })

  ipcMain.handle('coffee:expenses:delete', async (_e, id: string) => {
    try {
      return await prisma.coffeeExpense.delete({ where: { id } })
    } catch (err) {
      log.error('expenses:delete', err)
      throw err
    }
  })
}