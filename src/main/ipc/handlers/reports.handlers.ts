import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerReportsHandlers() {
  ipcMain.handle('reports:getSalesData', async (_, { startDate, endDate }: any) => {
    try {
      let query = `
        SELECT 
          st.id,
          st.total,
          st.createdAt,
          st.paymentMethod,
          st.status,
          c.name as customerName,
          u.username as cashierName
        FROM SaleTransaction st
        LEFT JOIN Customer c ON st.customerId = c.id
        LEFT JOIN User u ON st.userId = u.id
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
      
      query += ' ORDER BY st.createdAt DESC'
      return db.query(query, params)
    } catch (error) {
      console.error('Error getting sales data:', error)
      throw error
    }
  })
  
  ipcMain.handle('reports:getInventoryData', async () => {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.categoryId,
          c.name as categoryName,
          pv.sku,
          pv.color,
          pv.size,
          pv.stock,
          pv.reorderPoint,
          pv.price,
          pv.costPrice
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN ProductVariant pv ON p.id = pv.productId
        WHERE p.isArchived = 0
        ORDER BY p.name, pv.sku
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting inventory data:', error)
      throw error
    }
  })
  
  ipcMain.handle('reports:getFinancialData', async (_, { startDate, endDate }: any) => {
    try {
      let query = `
        SELECT 
          DATE(createdAt) as date,
          SUM(total) as revenue,
          COUNT(*) as transactions,
          AVG(total) as avgTransaction
        FROM SaleTransaction
        WHERE status != 'CANCELLED'
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
      
      query += ' GROUP BY DATE(createdAt) ORDER BY date ASC'
      return db.query(query, params)
    } catch (error) {
      console.error('Error getting financial data:', error)
      throw error
    }
  })
  
  ipcMain.handle('reports:getCustomerData', async () => {
    try {
      const query = `
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          COUNT(st.id) as totalPurchases,
          COALESCE(SUM(st.total), 0) as totalSpent,
          MAX(st.createdAt) as lastPurchase
        FROM Customer c
        LEFT JOIN SaleTransaction st ON c.id = st.customerId
        WHERE c.isArchived = 0
        GROUP BY c.id, c.name, c.email, c.phone
        ORDER BY totalSpent DESC
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting customer data:', error)
      throw error
    }
  })
  
  ipcMain.handle('reports:getQuickInsights', async (_, { days = 30 }: any) => {
    try {
      const salesQuery = `
        SELECT 
          COUNT(*) as totalSales,
          SUM(total) as revenue,
          AVG(total) as avgSale
        FROM SaleTransaction
        WHERE createdAt >= datetime('now', '-' || ? || ' days')
          AND status != 'CANCELLED'
      `
      const sales = db.queryOne(salesQuery, [days]) || { totalSales: 0, revenue: 0, avgSale: 0 }
      
      const topProductsQuery = `
        SELECT 
          p.name,
          SUM(si.quantity) as quantity
        FROM SaleItem si
        JOIN Product p ON si.productId = p.id
        JOIN SaleTransaction st ON si.transactionId = st.id
        WHERE st.createdAt >= datetime('now', '-' || ? || ' days')
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT 5
      `
      const topProducts = db.query(topProductsQuery, [days])
      
      const lowStockQuery = `
        SELECT 
          p.name,
          pv.sku,
          pv.stock,
          pv.reorderPoint
        FROM ProductVariant pv
        JOIN Product p ON pv.productId = p.id
        WHERE pv.stock <= pv.reorderPoint
        ORDER BY pv.stock ASC
        LIMIT 10
      `
      const lowStock = db.query(lowStockQuery)
      
      return {
        sales,
        topProducts,
        lowStock
      }
    } catch (error) {
      console.error('Error getting quick insights:', error)
      throw error
    }
  })
}
