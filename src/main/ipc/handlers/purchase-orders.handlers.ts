import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function setupPurchaseOrderHandlers() {
  ipcMain.handle('purchaseOrders:getAll', async () => {
    try {
      const query = `
        SELECT 
          po.*,
          s.name as supplierName
        FROM PurchaseOrder po
        LEFT JOIN Supplier s ON po.supplierId = s.id
        ORDER BY po.createdAt DESC
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting all purchase orders:', error)
      throw error
    }
  })
  
  ipcMain.handle('purchaseOrders:getById', async (_, id: string) => {
    try {
      const query = `
        SELECT 
          po.*,
          s.name as supplierName,
          s.email as supplierEmail,
          s.phone as supplierPhone
        FROM PurchaseOrder po
        LEFT JOIN Supplier s ON po.supplierId = s.id
        WHERE po.id = ?
      `
      return db.queryOne(query, [id])
    } catch (error) {
      console.error('Error getting purchase order by ID:', error)
      throw error
    }
  })
  
  ipcMain.handle('purchaseOrders:create', async (_, data: any) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO PurchaseOrder (id, supplierId, orderNumber, status, totalAmount, expectedDeliveryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.supplierId, data.orderNumber, 'PENDING', data.totalAmount, data.expectedDeliveryDate || null, new Date().toISOString()]
      )
      return db.queryOne('SELECT * FROM PurchaseOrder WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating purchase order:', error)
      throw error
    }
  })
  
  ipcMain.handle('purchaseOrders:updateStatus', async (_, id: string, status: string) => {
    try {
      db.execute('UPDATE PurchaseOrder SET status = ? WHERE id = ?', [status, id])
      return db.queryOne('SELECT * FROM PurchaseOrder WHERE id = ?', [id])
    } catch (error) {
      console.error('Error updating purchase order status:', error)
      throw error
    }
  })
  
  ipcMain.handle('purchaseOrders:delete', async (_, id: string) => {
    try {
      db.execute('DELETE FROM PurchaseOrder WHERE id = ?', [id])
      return { success: true }
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      throw error
    }
  })
}
