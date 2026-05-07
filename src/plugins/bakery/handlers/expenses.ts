import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Expenses')

export function registerBakeryExpenseHandlers(prisma: any) {
  ipcMain.handle('bakery:expenses:getAll', async (_e, options: {
    startDate?: string
    endDate?: string
    category?: string
    page?: number
    pageSize?: number
  } = {}) => {
    try {
      const page     = Math.max(1, options.page ?? 1)
      const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50))
      const skip     = (page - 1) * pageSize
      const where: any = {}
      if (options.category) where.category = options.category
      if (options.startDate || options.endDate) {
        where.date = {}
        if (options.startDate) where.date.gte = new Date(options.startDate)
        if (options.endDate)   where.date.lte = new Date(options.endDate)
      }
      const [data, total] = await Promise.all([
        prisma.bakeryExpense.findMany({ where, orderBy: { date: 'desc' }, skip, take: pageSize }),
        prisma.bakeryExpense.count({ where })
      ])
      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('bakery:expenses:getAll error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:expenses:create', async (_e, data: any) => {
    try {
      return await prisma.bakeryExpense.create({
        data: {
          date:          data.date ? new Date(data.date) : new Date(),
          category:      data.category      ?? 'other',
          description:   data.description,
          amount:        Number(data.amount),
          vendor:        data.vendor        ?? null,
          paymentMethod: data.paymentMethod ?? 'cash',
          recurrence:    data.recurrence    ?? 'one_time',
          notes:         data.notes         ?? null,
        }
      })
    } catch (err) {
      log.error('bakery:expenses:create error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:expenses:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.bakeryExpense.update({
        where: { id },
        data: {
          ...(data.date          && { date: new Date(data.date) }),
          ...(data.category      && { category: data.category }),
          ...(data.description   !== undefined && { description: data.description }),
          ...(data.amount        !== undefined && { amount: Number(data.amount) }),
          ...(data.vendor        !== undefined && { vendor: data.vendor }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.recurrence    && { recurrence: data.recurrence }),
          ...(data.notes         !== undefined && { notes: data.notes }),
        }
      })
    } catch (err) {
      log.error('bakery:expenses:update error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:expenses:delete', async (_e, id: string) => {
    try {
      return await prisma.bakeryExpense.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:expenses:delete error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:expenses:getSummary', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const where: any = {}
      if (options.startDate || options.endDate) {
        where.date = {}
        if (options.startDate) where.date.gte = new Date(options.startDate)
        if (options.endDate)   where.date.lte = new Date(options.endDate)
      }
      const [agg, byCategory] = await Promise.all([
        prisma.bakeryExpense.aggregate({ where, _sum: { amount: true }, _count: true }),
        prisma.bakeryExpense.groupBy({
          by: ['category'],
          where,
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } }
        })
      ])
      return {
        totalAmount: agg._sum.amount ?? 0,
        totalCount:  agg._count,
        byCategory
      }
    } catch (err) {
      log.error('bakery:expenses:getSummary error', err)
      throw err
    }
  })
}
