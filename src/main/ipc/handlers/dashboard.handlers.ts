/**
 * Dashboard IPC Handlers
 * Handles dashboard metrics and statistics
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Dashboard')

export function registerDashboardHandlers(prisma: any) {
  ipcMain.handle('dashboard:getMetrics', async () => {
    try {
      if (prisma) {
        const totalSales = await prisma.saleTransaction.aggregate({ 
          where: { status: 'completed' },
          _sum: { total: true },
          _count: true
        })
        
        // Calculate profit from items
        const profitData = await prisma.$queryRaw`
          SELECT SUM((si.price - si.cost) * si.quantity) as profit
          FROM SaleItem si
          JOIN SaleTransaction st ON si.transactionId = st.id
          WHERE st.status = 'completed'
        `
        const profit = profitData[0]?.profit || 0
        
        return { 
          sales: totalSales._sum.total || 0, 
          orders: totalSales._count || 0, 
          profit: Math.round(profit * 100) / 100
        }
      }

      return { sales: 0, orders: 0, profit: 0 }
    } catch (error) {
      log.error('Error fetching dashboard metrics:', error)
      throw error
    }
  })
}
