import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Overview')

export function registerOverviewHandlers(prisma: any) {
  ipcMain.handle('restaurant:getOverview', async () => {
    try {
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))
      const endOfDay = new Date(new Date().setHours(23, 59, 59, 999))

      const [tables, openOrders, todayOrders, todayReservations, availableMenuItems, activeKdsTickets] = await Promise.all([
        prisma.restaurantTable.findMany({ where: { isActive: true }, select: { status: true } }),
        prisma.dineInOrder.findMany({
          where: { status: { in: ['open', 'billing'] } },
          select: { total: true, openedAt: true, guestCount: true }
        }),
        prisma.dineInOrder.findMany({
          where: { closedAt: { gte: startOfDay, lte: endOfDay }, status: 'paid' },
          select: { total: true, tipAmount: true, guestCount: true }
        }),
        prisma.tableReservation.count({
          where: { date: { gte: startOfDay, lte: endOfDay }, status: { in: ['confirmed', 'pending', 'seated'] } }
        }),
        prisma.menuItem.count({ where: { isAvailable: true } }),
        prisma.dineInOrderItem.count({ where: { status: { in: ['pending', 'preparing'] } } })
      ])

      const statusCounts = tables.reduce((acc: Record<string, number>, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {})

      const todayRevenue = todayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      const todayGuests = todayOrders.reduce((s: number, o: any) => s + (o.guestCount || 1), 0)
      const activeOpenGuests = openOrders.reduce((s: number, o: any) => s + (o.guestCount || 1), 0)

      return {
        totalTables: tables.length,
        available: statusCounts['available'] || 0,
        occupied: statusCounts['occupied'] || 0,
        reserved: statusCounts['reserved'] || 0,
        cleaning: statusCounts['cleaning'] || 0,
        billing: statusCounts['billing'] || 0,
        openOrdersCount: openOrders.length,
        todayRevenue,
        todayGuests: todayGuests + activeOpenGuests,
        todayReservations,
        availableMenuItems,
        activeKdsTickets
      }
    } catch (err) {
      log.error('getOverview error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:getReportsData', async (_e, options?: { startDate?: string; endDate?: string }) => {
    try {
      const from = options?.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 86400000)
      const to = options?.endDate ? new Date(options.endDate) : new Date()

      const orders = await prisma.dineInOrder.findMany({
        where: {
          status: 'paid',
          closedAt: { gte: from, lte: to }
        },
        include: {
          items: { include: { menuItem: true } },
          payments: true
        }
      })

      const categoryMix: Record<string, { count: number; revenue: number }> = {}
      const topItemsMap: Record<string, { name: string; count: number; revenue: number }> = {}

      orders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          const cat = item.menuItem?.category || 'General'
          if (!categoryMix[cat]) categoryMix[cat] = { count: 0, revenue: 0 }
          categoryMix[cat].count += item.quantity
          categoryMix[cat].revenue += item.totalPrice || item.unitPrice * item.quantity

          const name = item.itemName
          if (!topItemsMap[name]) topItemsMap[name] = { name, count: 0, revenue: 0 }
          topItemsMap[name].count += item.quantity
          topItemsMap[name].revenue += item.totalPrice || item.unitPrice * item.quantity
        })
      })

      return {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((s: number, o: any) => s + (o.total || 0), 0),
        categoryMix,
        topItems: Object.values(topItemsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
      }
    } catch (err) {
      log.error('getReportsData error', err)
      throw err
    }
  })
}