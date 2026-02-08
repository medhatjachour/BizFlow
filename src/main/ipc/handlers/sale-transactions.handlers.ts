import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerSaleTransactionHandlers() {
  ipcMain.handle('saleTransactions:create', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('saleTransactions:getAll', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('saleTransactions:getById', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('saleTransactions:refund', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('saleTransactions:refundItems', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('saleTransactions:getByDateRange', async (_, { startDate, endDate }) => {
    try {
      const query = `
        SELECT 
          st.id,
          st.total,
          st.createdAt,
          st.paymentMethod,
          st.status,
          c.name as customerName,
          (SELECT COUNT(*) FROM SaleItem WHERE transactionId = st.id) as itemCount
        FROM SaleTransaction st
        LEFT JOIN Customer c ON st.customerId = c.id
        WHERE 1=1
          ${startDate ? "AND st.createdAt >= ?" : ""}
          ${endDate ? "AND st.createdAt <= ?" : ""}
        ORDER BY st.createdAt DESC
      `
      
      const params = []
      if (startDate) params.push(startDate)
      if (endDate) params.push(endDate)
      
      const transactions = db.query(query, params)
      return transactions
    } catch (error) {
      console.error('Error fetching transactions by date range:', error)
      throw error
    }
  })
}
