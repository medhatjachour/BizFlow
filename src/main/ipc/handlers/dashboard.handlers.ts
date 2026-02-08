/**
 * Dashboard IPC Handlers
 * Handles dashboard metrics and statistics
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerDashboardHandlers() {
  ipcMain.handle('dashboard:getMetrics', async () => {
    try {
      const totalSales = db.queryOne<{ total: number, count: number }>(
        `SELECT 
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as count
        FROM SaleTransaction 
        WHERE status = 'completed'`
      )
      
      // Calculate profit from items
      const profitData = db.queryOne<{ profit: number }>(
        `SELECT COALESCE(SUM((si.price - si.cost) * si.quantity), 0) as profit
        FROM SaleItem si
        JOIN SaleTransaction st ON si.transactionId = st.id
        WHERE st.status = 'completed'`
      )
      const profit = profitData?.profit || 0
      
      return { 
        sales: totalSales?.total || 0, 
        orders: totalSales?.count || 0, 
        profit: Math.round(profit * 100) / 100
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw error
    }
  })
}
