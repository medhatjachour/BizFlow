import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Commerce:Expenses')

export function registerCommerceExpenseHandlers(prisma: any) {
  // ── List ────────────────────────────────────────────────────────────────────
  ipcMain.handle('commerceExpenses:getAll', async (_e, params: {
    startDate?: string
    endDate?: string
    category?: string
  } = {}) => {
    try {
      const where: any = {}
      if (params.startDate || params.endDate) {
        where.date = {}
        if (params.startDate) where.date.gte = new Date(params.startDate)
        if (params.endDate)   where.date.lte = new Date(params.endDate)
      }
      if (params.category && params.category !== 'all') where.category = params.category
      return await prisma.commerceExpense.findMany({
        where,
        orderBy: { date: 'desc' },
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ── Create ──────────────────────────────────────────────────────────────────
  ipcMain.handle('commerceExpenses:create', async (_e, data: {
    amount: number
    description: string
    category: string
    vendor?: string
    paymentMethod?: string
    recurrence?: string
    date?: string
    notes?: string
  }) => {
    try {
      return await prisma.commerceExpense.create({
        data: {
          amount:        data.amount,
          description:   data.description,
          category:      data.category,
          vendor:        data.vendor        ?? null,
          paymentMethod: data.paymentMethod ?? 'cash',
          recurrence:    data.recurrence    ?? 'one_time',
          date:          data.date ? new Date(data.date) : new Date(),
          notes:         data.notes         ?? null,
        },
      })
    } catch (err) { log.error('create', err); throw err }
  })

  // ── Update ──────────────────────────────────────────────────────────────────
  ipcMain.handle('commerceExpenses:update', async (_e, { id, data }: {
    id: string
    data: {
      amount?: number
      description?: string
      category?: string
      vendor?: string
      paymentMethod?: string
      recurrence?: string
      date?: string
      notes?: string
    }
  }) => {
    try {
      const { date, ...rest } = data
      return await prisma.commerceExpense.update({
        where: { id },
        data:  { ...rest, ...(date ? { date: new Date(date) } : {}) },
      })
    } catch (err) { log.error('update', err); throw err }
  })

  // ── Delete ──────────────────────────────────────────────────────────────────
  ipcMain.handle('commerceExpenses:delete', async (_e, id: string) => {
    try {
      return await prisma.commerceExpense.delete({ where: { id } })
    } catch (err) { log.error('delete', err); throw err }
  })
}
