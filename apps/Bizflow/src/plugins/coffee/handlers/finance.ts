import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Finance')

function withDateRange(field: string, opts?: { startDate?: string; endDate?: string }) {
  const where: any = {}
  if (opts?.startDate || opts?.endDate) {
    where[field] = {}
    if (opts.startDate) where[field].gte = new Date(opts.startDate)
    if (opts.endDate) where[field].lte = new Date(opts.endDate)
  }
  return where
}

export function registerFinanceHandlers(prisma: any) {
  ipcMain.handle('coffee:finance:getOverview', async (_e, opts?: { startDate?: string; endDate?: string }) => {
    try {
      const paidWhere: any = { status: 'paid', ...withDateRange('closedAt', opts) }
      const [orders, shifts, voidedOrders, openOrders, expenses] = await Promise.all([
        prisma.coffeeOrder.findMany({
          where: paidWhere,
          include: {
            items: { include: { product: { select: { cost: true } } } }
          }
        }),
        prisma.coffeeShift.findMany({
          where: withDateRange('openedAt', opts)
        }),
        prisma.coffeeOrder.findMany({
          where: { status: 'voided', ...withDateRange('closedAt', opts) },
          select: { total: true }
        }),
        prisma.coffeeOrder.findMany({
          where: { status: 'open', ...withDateRange('openedAt', opts) },
          select: { total: true, subtotal: true }
        }),
        prisma.coffeeExpense.findMany({
          where: { ...withDateRange('date', opts) },
          select: { amount: true, category: true, paymentMethod: true, shiftId: true }
        })
      ])

      let netSales = 0
      let grossSales = 0
      let totalDiscount = 0
      let cogs = 0
      let operationalExpenses = 0
      let expenseCount = 0
      let shiftExpenseTotal = 0
      let discountOrders = 0
      const payment: Record<string, number> = { cash: 0, card: 0, vodafone_cash: 0, other: 0 }
      const expenseByCategory = new Map<string, number>()

      for (const o of orders) {
        netSales += Number(o.total || 0)
        grossSales += Number(o.subtotal || 0)
        totalDiscount += Number(o.discount || 0)
        if (Number(o.discount || 0) > 0) discountOrders += 1

        const pm = String(o.paymentMethod || '').toLowerCase()
        if (pm === 'cash' || pm === 'card' || pm === 'vodafone_cash') payment[pm] += Number(o.total || 0)
        else payment.other += Number(o.total || 0)

        for (const item of o.items || []) {
          cogs += Number(item.quantity || 0) * Number(item.product?.cost || 0)
        }
      }

      for (const expense of expenses) {
        const amount = Number(expense.amount || 0)
        operationalExpenses += amount
        expenseCount += 1
        if (expense.shiftId) shiftExpenseTotal += amount
        expenseByCategory.set(expense.category, (expenseByCategory.get(expense.category) ?? 0) + amount)
      }

      const grossProfit = netSales - cogs
      const netProfitAfterExpenses = grossProfit - operationalExpenses
      const grossMarginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0
      const refundsAndVoids = voidedOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
      const openOrdersValue = openOrders.reduce((s: number, o: any) => s + Number(o.total || o.subtotal || 0), 0)

      const shiftStats = shifts.reduce(
        (acc: any, s: any) => {
          acc.openingCash += Number(s.openingCash || 0)
          acc.cashSales += Number(s.cashTotal || 0)
          acc.closingCash += Number(s.closingCash || 0)
          acc.cashDifference += Number(s.cashDifference || 0)
          if (s.status === 'closed') acc.closedShifts += 1
          return acc
        },
        { openingCash: 0, cashSales: 0, closingCash: 0, cashDifference: 0, closedShifts: 0 }
      )

      return {
        netSales,
        grossSales,
        totalDiscount,
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? netSales / orders.length : 0,
        cogs,
        operationalExpenses,
        expenseCount,
        totalExpenses: cogs + operationalExpenses,
        grossProfit,
        netProfitAfterExpenses,
        grossMarginPct,
        avgDiscountPerOrder: orders.length > 0 ? totalDiscount / orders.length : 0,
        discountedOrders: discountOrders,
        discountOrderRatePct: orders.length > 0 ? (discountOrders / orders.length) * 100 : 0,
        payment,
        paymentPct: {
          cash: netSales > 0 ? (payment.cash / netSales) * 100 : 0,
          card: netSales > 0 ? (payment.card / netSales) * 100 : 0,
          vodafone_cash: netSales > 0 ? (payment.vodafone_cash / netSales) * 100 : 0,
          other: netSales > 0 ? (payment.other / netSales) * 100 : 0
        },
        refundsAndVoids,
        openOrdersCount: openOrders.length,
        openOrdersValue,
        expenseByCategory: Array.from(expenseByCategory.entries())
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total),
        shiftStats: {
          ...shiftStats,
          expectedDrawer: shiftStats.openingCash + shiftStats.cashSales,
          linkedExpenseTotal: shiftExpenseTotal,
          expectedAfterExpenses: shiftStats.openingCash + shiftStats.cashSales - shiftExpenseTotal
        }
      }
    } catch (err) {
      log.error('finance:getOverview', err)
      throw err
    }
  })

  ipcMain.handle('coffee:finance:getTransactions', async (_e, opts?: {
    startDate?: string
    endDate?: string
    paymentMethod?: string
    type?: string
    search?: string
    page?: number
    pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 40
      const where: any = { status: 'paid', ...withDateRange('closedAt', opts) }
      if (opts?.paymentMethod) where.paymentMethod = opts.paymentMethod
      if (opts?.type) where.type = opts.type
      if (opts?.search?.trim()) {
        const q = opts.search.trim()
        where.OR = [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q, mode: 'insensitive' } },
          { cashier: { username: { contains: q, mode: 'insensitive' } } },
          { cashier: { fullName: { contains: q, mode: 'insensitive' } } },
          { table: { name: { contains: q, mode: 'insensitive' } } }
        ]
      }

      const [total, items] = await Promise.all([
        prisma.coffeeOrder.count({ where }),
        prisma.coffeeOrder.findMany({
          where,
          include: {
            cashier: { select: { id: true, username: true, fullName: true } },
            table: { select: { number: true, name: true } },
            shift: { select: { id: true, openedAt: true, closedAt: true } }
          },
          orderBy: { closedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (err) {
      log.error('finance:getTransactions', err)
      throw err
    }
  })
}
