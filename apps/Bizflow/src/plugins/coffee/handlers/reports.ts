import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Reports')

function withDateRange(field: string, opts?: { startDate?: string; endDate?: string }) {
  const where: any = {}
  if (opts?.startDate || opts?.endDate) {
    where[field] = {}
    if (opts.startDate) where[field].gte = new Date(opts.startDate)
    if (opts.endDate) where[field].lte = new Date(opts.endDate)
  }
  return where
}

export function registerReportHandlers(prisma: any) {
  ipcMain.handle('coffee:reports:getOverview', async (_e, opts?: { startDate?: string; endDate?: string }) => {
    try {
      const where: any = { status: 'paid', ...withDateRange('closedAt', opts) }
      const [orders, lowStockCount, outOfStockCount, expenses] = await Promise.all([
        prisma.coffeeOrder.findMany({
          where,
          include: {
            cashier: { select: { id: true, username: true, fullName: true } },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    cost: true,
                    category: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        }),
        prisma.coffeeProduct.count({ where: { isAvailable: true, stock: { lte: 5, gt: 0 } } }),
        prisma.coffeeProduct.count({ where: { isAvailable: true, stock: { lte: 0 } } }),
        prisma.coffeeExpense.findMany({
          where: { ...withDateRange('date', opts) },
          select: { amount: true, category: true, paymentMethod: true }
        })
      ])

      let totalRevenue = 0
      let totalDiscount = 0
      let totalOrders = 0
      let totalItemsSold = 0
      let totalCogs = 0
      let operationalExpenses = 0
      let expenseCount = 0
      let deliveryRevenue = 0
      const payment: Record<string, number> = { cash: 0, card: 0, vodafone_cash: 0, other: 0 }
      const orderTypes: Record<string, number> = { dine_in: 0, takeaway: 0, delivery: 0, other: 0 }
      const hourSales = Array.from({ length: 24 }, () => 0)
      const cashierMap = new Map<string, { id: string; name: string; orders: number; revenue: number }>()
      const customerMap = new Map<string, { key: string; name: string; orders: number; spent: number }>()
      const dayMap = new Map<string, { date: string; revenue: number; orders: number }>()

      for (const o of orders) {
        totalRevenue += Number(o.total || 0)
        totalDiscount += Number(o.discount || 0)
        totalOrders += 1
        if (o.type === 'delivery') deliveryRevenue += Number(o.total || 0)

        const pm = String(o.paymentMethod || '').toLowerCase()
        if (pm === 'cash' || pm === 'card' || pm === 'vodafone_cash') payment[pm] += Number(o.total || 0)
        else payment.other += Number(o.total || 0)

        if (o.type === 'dine_in' || o.type === 'takeaway' || o.type === 'delivery') orderTypes[o.type] += 1
        else orderTypes.other += 1

        if (o.closedAt) {
          const h = new Date(o.closedAt).getHours()
          hourSales[h] += Number(o.total || 0)

          const date = new Date(o.closedAt).toISOString().slice(0, 10)
          const row = dayMap.get(date) || { date, revenue: 0, orders: 0 }
          row.revenue += Number(o.total || 0)
          row.orders += 1
          dayMap.set(date, row)
        }

        if (o.cashier) {
          const key = o.cashier.id
          const row = cashierMap.get(key) || {
            id: o.cashier.id,
            name: o.cashier.fullName || o.cashier.username,
            orders: 0,
            revenue: 0
          }
          row.orders += 1
          row.revenue += Number(o.total || 0)
          cashierMap.set(key, row)
        }

        const customerKey = o.customerId || o.customerPhone || (o.customerName ? `name:${o.customerName.trim().toLowerCase()}` : null)
        if (customerKey) {
          const row = customerMap.get(customerKey) || {
            key: customerKey,
            name: o.customerName || o.customerPhone || 'Walk-in',
            orders: 0,
            spent: 0
          }
          row.orders += 1
          row.spent += Number(o.total || 0)
          customerMap.set(customerKey, row)
        }

        for (const item of o.items || []) {
          const qty = Number(item.quantity || 0)
          totalItemsSold += qty
          totalCogs += qty * Number(item.product?.cost || 0)
        }
      }

      const expenseByCategoryMap = new Map<string, number>()
      for (const expense of expenses) {
        const amount = Number(expense.amount || 0)
        operationalExpenses += amount
        expenseCount += 1
        expenseByCategoryMap.set(expense.category, (expenseByCategoryMap.get(expense.category) ?? 0) + amount)
      }

      const bestHour = hourSales.reduce(
        (best, value, hour) => (value > best.value ? { hour, value } : best),
        { hour: 0, value: 0 }
      )

      const dailyRows = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      const bestDay = dailyRows.reduce((best, row) => row.revenue > best.revenue ? row : best, { date: '', revenue: 0, orders: 0 })
      const worstDay = dailyRows.reduce((worst, row) => {
        if (!worst.date) return row
        return row.revenue < worst.revenue ? row : worst
      }, { date: '', revenue: 0, orders: 0 })
      const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.spent - a.spent).slice(0, 8)
      const repeatCustomers = Array.from(customerMap.values()).filter(c => c.orders > 1).length
      const netProfitAfterExpenses = totalRevenue - totalCogs - operationalExpenses

      return {
        totalRevenue,
        totalDiscount,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalItemsSold,
        totalCogs,
        operationalExpenses,
        expenseCount,
        totalExpenses: totalCogs + operationalExpenses,
        grossProfit: totalRevenue - totalCogs,
        netProfitAfterExpenses,
        grossMarginPct: totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0,
        avgItemsPerOrder: totalOrders > 0 ? totalItemsSold / totalOrders : 0,
        discountRatePct: totalRevenue > 0 ? (totalDiscount / (totalRevenue + totalDiscount)) * 100 : 0,
        deliveryRevenue,
        payment,
        orderTypes,
        peakHour: bestHour,
        topCashiers: Array.from(cashierMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        topCustomers,
        uniqueCustomers: customerMap.size,
        repeatCustomers,
        repeatCustomerRatePct: customerMap.size > 0 ? (repeatCustomers / customerMap.size) * 100 : 0,
        lowStockCount,
        outOfStockCount,
        expenseByCategory: Array.from(expenseByCategoryMap.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
        bestDay,
        worstDay
      }
    } catch (err) {
      log.error('reports:getOverview', err)
      throw err
    }
  })

  ipcMain.handle('coffee:reports:getDailyTrend', async (_e, opts?: { startDate?: string; endDate?: string }) => {
    try {
      const where: any = { status: 'paid', ...withDateRange('closedAt', opts) }
      const orders = await prisma.coffeeOrder.findMany({
        where,
        select: { closedAt: true, total: true, discount: true }
      })

      const dayMap = new Map<string, { date: string; revenue: number; orders: number; discount: number }>()
      for (const o of orders) {
        if (!o.closedAt) continue
        const date = new Date(o.closedAt).toISOString().slice(0, 10)
        const row = dayMap.get(date) || { date, revenue: 0, orders: 0, discount: 0 }
        row.revenue += Number(o.total || 0)
        row.discount += Number(o.discount || 0)
        row.orders += 1
        dayMap.set(date, row)
      }

      return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    } catch (err) {
      log.error('reports:getDailyTrend', err)
      throw err
    }
  })

  ipcMain.handle('coffee:reports:getTopProducts', async (_e, opts?: { startDate?: string; endDate?: string; limit?: number }) => {
    try {
      const where: any = { order: { status: 'paid', ...withDateRange('closedAt', opts) } }
      const items = await prisma.coffeeOrderItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              cost: true,
              category: { select: { id: true, name: true } }
            }
          }
        }
      })

      const byProduct = new Map<string, {
        productId: string | null
        productName: string
        categoryName: string
        quantity: number
        revenue: number
        cogs: number
        grossProfit: number
      }>()

      for (const i of items) {
        const key = i.productId || `name:${i.productName}`
        const qty = Number(i.quantity || 0)
        const rev = Number(i.total || 0)
        const cogs = qty * Number(i.product?.cost || 0)
        const row = byProduct.get(key) || {
          productId: i.productId || null,
          productName: i.product?.name || i.productName,
          categoryName: i.product?.category?.name || 'Uncategorized',
          quantity: 0,
          revenue: 0,
          cogs: 0,
          grossProfit: 0
        }
        row.quantity += qty
        row.revenue += rev
        row.cogs += cogs
        row.grossProfit += rev - cogs
        byProduct.set(key, row)
      }

      return Array.from(byProduct.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, opts?.limit ?? 20)
    } catch (err) {
      log.error('reports:getTopProducts', err)
      throw err
    }
  })

  ipcMain.handle('coffee:reports:getCategoryPerformance', async (_e, opts?: { startDate?: string; endDate?: string; limit?: number }) => {
    try {
      const where: any = { order: { status: 'paid', ...withDateRange('closedAt', opts) } }
      const items = await prisma.coffeeOrderItem.findMany({
        where,
        include: {
          product: {
            select: {
              cost: true,
              category: { select: { id: true, name: true } }
            }
          }
        }
      })

      const byCategory = new Map<string, { categoryId: string | null; categoryName: string; quantity: number; revenue: number; cogs: number; grossProfit: number }>()
      for (const item of items) {
        const categoryId = item.product?.category?.id || null
        const categoryName = item.product?.category?.name || 'Uncategorized'
        const key = categoryId || 'uncategorized'
        const qty = Number(item.quantity || 0)
        const revenue = Number(item.total || 0)
        const cogs = qty * Number(item.product?.cost || 0)
        const row = byCategory.get(key) || { categoryId, categoryName, quantity: 0, revenue: 0, cogs: 0, grossProfit: 0 }
        row.quantity += qty
        row.revenue += revenue
        row.cogs += cogs
        row.grossProfit += revenue - cogs
        byCategory.set(key, row)
      }

      return Array.from(byCategory.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, opts?.limit ?? 20)
    } catch (err) {
      log.error('reports:getCategoryPerformance', err)
      throw err
    }
  })

  ipcMain.handle('coffee:reports:getCustomerInsights', async (_e, opts?: { startDate?: string; endDate?: string; limit?: number }) => {
    try {
      const where: any = { status: 'paid', ...withDateRange('closedAt', opts) }
      const orders = await prisma.coffeeOrder.findMany({
        where,
        select: {
          id: true,
          total: true,
          closedAt: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          type: true
        }
      })

      const byCustomer = new Map<string, { key: string; name: string; phone?: string | null; orders: number; spent: number; lastVisit?: string; deliveryOrders: number }>()
      for (const order of orders) {
        const key = order.customerId || order.customerPhone || (order.customerName ? `name:${order.customerName.trim().toLowerCase()}` : null)
        if (!key) continue
        const row = byCustomer.get(key) || {
          key,
          name: order.customerName || order.customerPhone || 'Walk-in',
          phone: order.customerPhone,
          orders: 0,
          spent: 0,
          lastVisit: order.closedAt ? new Date(order.closedAt).toISOString() : undefined,
          deliveryOrders: 0
        }
        row.orders += 1
        row.spent += Number(order.total || 0)
        if (order.type === 'delivery') row.deliveryOrders += 1
        if (order.closedAt && (!row.lastVisit || order.closedAt > row.lastVisit)) row.lastVisit = new Date(order.closedAt).toISOString()
        byCustomer.set(key, row)
      }

      const topCustomers = Array.from(byCustomer.values()).sort((a, b) => b.spent - a.spent).slice(0, opts?.limit ?? 10)
      const repeatCustomers = Array.from(byCustomer.values()).filter(c => c.orders > 1).length

      return {
        topCustomers,
        totalCustomers: byCustomer.size,
        repeatCustomers,
        repeatRatePct: byCustomer.size > 0 ? (repeatCustomers / byCustomer.size) * 100 : 0
      }
    } catch (err) {
      log.error('reports:getCustomerInsights', err)
      throw err
    }
  })
}
