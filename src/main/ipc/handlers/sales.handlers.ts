/**
 * Sales IPC Handlers (Legacy - mostly deprecated)
 * Most sales now handled via SaleTransaction system
 * These handlers kept for backward compatibility only
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerSalesHandlers() {
  // Legacy handler - use sale-transactions:create instead
  ipcMain.handle('sales:create', async (_, saleData) => {
    console.warn('sales:create is deprecated - use sale-transactions:create instead')
    return { success: false, message: 'This endpoint is deprecated. Use sale-transactions:create instead' }
  })

  ipcMain.handle('sales:getAll', async () => {
    console.warn('sales:getAll is deprecated - use sale-transactions:getAll instead')
    return []
  })

  /**
   * Get sales by date range - OPTIMIZED for dashboard
   * Only loads sales within specified date range
   */
  ipcMain.handle('sales:getByDateRange', async (_, options = {}) => {
    console.warn('sales:getByDateRange is deprecated - use sale-transactions:getByDateRange instead')
    return []
  })

  /**
   * Get sales statistics - OPTIMIZED with raw SQL
   */
  ipcMain.handle('sales:getStats', async (_, options = {}) => {
    console.warn('sales:getStats is deprecated - use analytics:getOverallStats instead')
    return {
      totalSales: 0,
      completedSales: 0,
      refundedSales: 0,
      totalRevenue: 0
    }
  })

  ipcMain.handle('sales:refund', async (_, saleId) => {
    console.warn('sales:refund is deprecated - use sale-transactions:refund instead')
    return { success: false, message: 'This endpoint is deprecated. Use sale-transactions:refund instead' }
  })
}
