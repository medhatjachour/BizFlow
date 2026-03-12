import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Overview')

export function registerOverviewHandlers(prisma: any) {
  ipcMain.handle('restaurant:getOverview', async () => {
    try {
      const [tables, openOrders, todayReservations, menuItems] = await Promise.all([
        prisma.restaurantTable.findMany({ where: { isActive: true }, select: { status: true } }),
        prisma.dineInOrder.count({ where: { status: 'open' } }),
        prisma.tableReservation.count({
          where: {
            date: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) },
            status: { in: ['confirmed', 'pending'] }
          }
        }),
        prisma.menuItem.count({ where: { isAvailable: true } })
      ])

      const statusCounts = tables.reduce((acc: Record<string, number>, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1; return acc
      }, {})

      return {
        totalTables:        tables.length,
        available:          statusCounts['available'] || 0,
        occupied:           statusCounts['occupied']  || 0,
        reserved:           statusCounts['reserved']  || 0,
        cleaning:           statusCounts['cleaning']  || 0,
        openOrders,
        todayReservations,
        availableMenuItems: menuItems
      }
    } catch (err) { log.error('getOverview error', err); throw err }
  })
}
