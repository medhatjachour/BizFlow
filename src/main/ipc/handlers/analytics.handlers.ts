import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerAnalyticsHandlers() {
  ipcMain.handle('analytics:recordStockMovement', async (_, movement: any) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO StockMovement (id, variantId, type, quantity, reason, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, movement.variantId, movement.type, movement.quantity, movement.reason || null, movement.userId, new Date().toISOString()]
      )
      return { id, success: true }
    } catch (error) {
      console.error('Error recording stock movement:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getStockMovementHistory', async (_, { startDate, endDate, variantId }: any) => {
    try {
      let query = `
        SELECT sm.*, pv.sku, p.name as productName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        WHERE 1=1
      `
      const params: any[] = []
      
      if (startDate) {
        query += ' AND sm.createdAt >= ?'
        params.push(startDate)
      }
      if (endDate) {
        query += ' AND sm.createdAt <= ?'
        params.push(endDate)
      }
      if (variantId) {
        query += ' AND sm.variantId = ?'
        params.push(variantId)
      }
      
      query += ' ORDER BY sm.createdAt DESC LIMIT 100'
      return db.query(query, params)
    } catch (error) {
      console.error('Error getting stock movement history:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getStockoutHistory', async () => {
    try {
      const query = `
        SELECT sm.*, pv.sku, p.name as productName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        WHERE sm.type = 'STOCKOUT'
        ORDER BY sm.createdAt DESC
        LIMIT 50
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting stockout history:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getRestockHistory', async () => {
    try {
      const query = `
        SELECT sm.*, pv.sku, p.name as productName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        WHERE sm.type = 'RESTOCK'
        ORDER BY sm.createdAt DESC
        LIMIT 50
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting restock history:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getProductSalesStats', async (_, productId: string) => {
    try {
      const query = `
        SELECT 
          COUNT(*) as totalSales,
          SUM(si.quantity) as totalQuantity,
          SUM(si.subtotal) as totalRevenue
        FROM SaleItem si
        WHERE si.productId = ?
      `
      return db.queryOne(query, [productId]) || { totalSales: 0, totalQuantity: 0, totalRevenue: 0 }
    } catch (error) {
      console.error('Error getting product sales stats:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getProductSalesTrend', async (_, { productId, days = 30 }: any) => {
    try {
      const query = `
        SELECT 
          DATE(st.createdAt) as date,
          SUM(si.quantity) as quantity,
          SUM(si.subtotal) as revenue
        FROM SaleItem si
        JOIN SaleTransaction st ON si.transactionId = st.id
        WHERE si.productId = ?
          AND st.createdAt >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(st.createdAt)
        ORDER BY date ASC
      `
      return db.query(query, [productId, days])
    } catch (error) {
      console.error('Error getting product sales trend:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getTopSellingProducts', async (_, { limit = 10, startDate, endDate }: any) => {
    try {
      let query = `
        SELECT 
          p.id,
          p.name,
          SUM(si.quantity) as totalQuantity,
          SUM(si.subtotal) as totalRevenue,
          COUNT(DISTINCT si.transactionId) as salesCount
        FROM SaleItem si
        JOIN Product p ON si.productId = p.id
        JOIN SaleTransaction st ON si.transactionId = st.id
        WHERE 1=1
      `
      const params: any[] = []
      
      if (startDate) {
        query += ' AND st.createdAt >= ?'
        params.push(startDate)
      }
      if (endDate) {
        query += ' AND st.createdAt <= ?'
        params.push(endDate)
      }
      
      query += ` GROUP BY p.id, p.name ORDER BY totalQuantity DESC LIMIT ?`
      params.push(limit)
      
      return db.query(query, params)
    } catch (error) {
      console.error('Error getting top selling products:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getOverallStats', async (_, { startDate, endDate }: any) => {
    try {
      let query = `
        SELECT 
          COUNT(*) as totalTransactions,
          SUM(total) as totalRevenue,
          AVG(total) as avgTransaction,
          COUNT(DISTINCT customerId) as uniqueCustomers
        FROM SaleTransaction
        WHERE 1=1
      `
      const params: any[] = []
      
      if (startDate) {
        query += ' AND createdAt >= ?'
        params.push(startDate)
      }
      if (endDate) {
        query += ' AND createdAt <= ?'
        params.push(endDate)
      }
      
      return db.queryOne(query, params) || { totalTransactions: 0, totalRevenue: 0, avgTransaction: 0, uniqueCustomers: 0 }
    } catch (error) {
      console.error('Error getting overall stats:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:getAllStockMovements', async (_, { limit = 100 }: any) => {
    try {
      const query = `
        SELECT sm.*, pv.sku, p.name as productName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        ORDER BY sm.createdAt DESC
        LIMIT ?
      `
      return db.query(query, [limit])
    } catch (error) {
      console.error('Error getting all stock movements:', error)
      throw error
    }
  })
  
  ipcMain.handle('analytics:compareStores', async () => {
    // Placeholder - returns empty array (stores feature may not be implemented)
    return []
  })
  
  ipcMain.handle('analytics:getStoreMetrics', async () => {
    // Placeholder - returns empty object (stores feature may not be implemented)
    return {}
  })
}
