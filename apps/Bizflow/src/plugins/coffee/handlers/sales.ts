// ─── Coffee: Sales History Handler ───────────────────────────────────────────
// Provides read-only access to completed (paid) orders for the Sales tab.
//
// IPC channels:
//   coffee:sales:getAll    — paginated list of paid orders with items
//   coffee:sales:getSummary — period aggregates (total revenue, counts, breakdown)
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Sales')

export function registerSalesHandlers(prisma: any) {
  // Paginated list of completed sales
  ipcMain.handle('coffee:sales:getAll', async (_e, opts?: {
    startDate?: string; endDate?: string; paymentMethod?: string;
    type?: string; page?: number; pageSize?: number
  }) => {
    try {
      const page     = opts?.page     ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = { status: 'paid' }

      if (opts?.paymentMethod) where.paymentMethod = opts.paymentMethod
      if (opts?.type)          where.type          = opts.type
      if (opts?.startDate || opts?.endDate) {
        where.closedAt = {}
        if (opts?.startDate) where.closedAt.gte = new Date(opts.startDate)
        if (opts?.endDate)   where.closedAt.lte = new Date(opts.endDate)
      }

      const [total, items] = await Promise.all([
        prisma.coffeeOrder.count({ where }),
        prisma.coffeeOrder.findMany({
          where,
          include: {
            table:   { select: { id: true, number: true, name: true } },
            cashier: { select: { id: true, username: true, fullName: true } },
            items:   { select: { id: true, productName: true, quantity: true, unitPrice: true, total: true } }
          },
          orderBy: { closedAt: 'desc' },
          skip:  (page - 1) * pageSize,
          take:  pageSize
        })
      ])

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) { log.error('sales:getAll', err); throw err }
  })

  // Period summary — revenue, order counts, and payment method breakdown
  ipcMain.handle('coffee:sales:getSummary', async (_e, opts?: {
    startDate?: string; endDate?: string
  }) => {
    try {
      const where: any = { status: 'paid' }
      if (opts?.startDate || opts?.endDate) {
        where.closedAt = {}
        if (opts?.startDate) where.closedAt.gte = new Date(opts.startDate)
        if (opts?.endDate)   where.closedAt.lte = new Date(opts.endDate)
      }

      const orders = await prisma.coffeeOrder.findMany({
        where,
        select: { total: true, paymentMethod: true, type: true }
      })

      const summary = orders.reduce(
        (acc: any, o: any) => {
          acc.totalRevenue  += o.total
          acc.totalOrders   += 1
          acc.cash          += o.paymentMethod === 'cash'          ? o.total : 0
          acc.card          += o.paymentMethod === 'card'          ? o.total : 0
          acc.vodafoneCash  += o.paymentMethod === 'vodafone_cash' ? o.total : 0
          acc.dineIn        += o.type === 'dine_in'  ? 1 : 0
          acc.takeaway      += o.type === 'takeaway' ? 1 : 0
          acc.delivery      += o.type === 'delivery' ? 1 : 0
          return acc
        },
        { totalRevenue: 0, totalOrders: 0, cash: 0, card: 0, vodafoneCash: 0, dineIn: 0, takeaway: 0, delivery: 0 }
      )

      summary.avgOrderValue = summary.totalOrders > 0
        ? summary.totalRevenue / summary.totalOrders
        : 0

      return summary
    } catch (err) { log.error('sales:getSummary', err); throw err }
  })
}
