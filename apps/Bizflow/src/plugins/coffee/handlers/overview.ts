// ─── Coffee: Overview / Dashboard Handler ────────────────────────────────────
// Returns a single aggregated snapshot for the dashboard:
//   - Table availability counts
//   - Open orders count
//   - Today's sales summary
//   - Active shift info
//   - Low-stock products count
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Overview')

export function registerOverviewHandlers(prisma: any) {
  ipcMain.handle('coffee:getOverview', async () => {
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

      const [tables, openOrders, todaySales, activeShift, lowStock, totalProducts] = await Promise.all([
        // Table status breakdown
        prisma.coffeeTable.findMany({ where: { isActive: true }, select: { status: true } }),
        // Count of open orders right now
        prisma.coffeeOrder.count({ where: { status: 'open' } }),
        // Today's completed sales aggregate
        prisma.coffeeOrder.findMany({
          where: { status: 'paid', closedAt: { gte: todayStart, lte: todayEnd } },
          select: { total: true, paymentMethod: true, type: true }
        }),
        // Currently open shift
        prisma.coffeeShift.findFirst({
          where: { status: 'open' },
          include: { cashier: { select: { id: true, username: true, fullName: true } } }
        }),
        // Low-stock products
        prisma.coffeeProduct.count({ where: { isAvailable: true, stock: { lte: prisma.coffeeProduct.fields?.reorderPoint ?? 5 } } }).catch(() =>
          prisma.coffeeProduct.count({ where: { isAvailable: true, stock: { lte: 5 } } })
        ),
        prisma.coffeeProduct.count({ where: { isAvailable: true } })
      ])

      // Table counts by status
      const tableStatus = tables.reduce((acc: Record<string, number>, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1; return acc
      }, {})

      // Today's revenue & breakdown
      const todayRevenue = todaySales.reduce((s: number, o: any) => s + o.total, 0)
      const todayCash    = todaySales.filter((o: any) => o.paymentMethod === 'cash').reduce((s: number, o: any) => s + o.total, 0)
      const todayCard    = todaySales.filter((o: any) => o.paymentMethod === 'card').reduce((s: number, o: any) => s + o.total, 0)
      const todayVoda    = todaySales.filter((o: any) => o.paymentMethod === 'vodafone_cash').reduce((s: number, o: any) => s + o.total, 0)

      return {
        tables: {
          total:     tables.length,
          available: tableStatus['available'] || 0,
          occupied:  tableStatus['occupied']  || 0,
          cleaning:  tableStatus['cleaning']  || 0
        },
        openOrders,
        today: {
          revenue:     todayRevenue,
          orders:      todaySales.length,
          cash:        todayCash,
          card:        todayCard,
          vodafoneCash: todayVoda,
          dineIn:      todaySales.filter((o: any) => o.type === 'dine_in').length,
          takeaway:    todaySales.filter((o: any) => o.type === 'takeaway').length,
          delivery:    todaySales.filter((o: any) => o.type === 'delivery').length
        },
        activeShift,
        inventory: { lowStock, totalProducts }
      }
    } catch (err) { log.error('getOverview', err); throw err }
  })
}
