import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerStockMovementHandlers() {
  ipcMain.handle('stockMovements:record', async (_, movement: { variantId: string; type: string; quantity: number; reason?: string; userId: string }) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO StockMovement (id, variantId, type, quantity, reason, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, movement.variantId, movement.type, movement.quantity, movement.reason || null, movement.userId, new Date().toISOString()]
      )
      
      // Update variant stock
      if (movement.type === 'RESTOCK' || movement.type === 'ADJUSTMENT_IN') {
        db.execute('UPDATE ProductVariant SET stock = stock + ? WHERE id = ?', [movement.quantity, movement.variantId])
      } else if (movement.type === 'STOCKOUT' || movement.type === 'ADJUSTMENT_OUT') {
        db.execute('UPDATE ProductVariant SET stock = stock - ? WHERE id = ?', [movement.quantity, movement.variantId])
      }
      
      return { id, success: true }
    } catch (error) {
      console.error('Error recording stock movement:', error)
      throw error
    }
  })
  
  ipcMain.handle('stockMovements:getHistory', async (_, { startDate, endDate, limit = 100 }: any) => {
    try {
      let query = `
        SELECT 
          sm.*,
          pv.sku,
          p.name as productName,
          u.username as userName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        LEFT JOIN User u ON sm.userId = u.id
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
      
      query += ' ORDER BY sm.createdAt DESC LIMIT ?'
      params.push(limit)
      
      return db.query(query, params)
    } catch (error) {
      console.error('Error getting stock movement history:', error)
      throw error
    }
  })
  
  ipcMain.handle('stockMovements:getProductHistory', async (_, productId: string) => {
    try {
      const query = `
        SELECT 
          sm.*,
          pv.sku,
          u.username as userName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        LEFT JOIN User u ON sm.userId = u.id
        WHERE pv.productId = ?
        ORDER BY sm.createdAt DESC
        LIMIT 50
      `
      return db.query(query, [productId])
    } catch (error) {
      console.error('Error getting product history:', error)
      throw error
    }
  })
  
  ipcMain.handle('stockMovements:getRecent', async (_, limit = 20) => {
    try {
      const query = `
        SELECT 
          sm.*,
          pv.sku,
          p.name as productName,
          u.username as userName
        FROM StockMovement sm
        JOIN ProductVariant pv ON sm.variantId = pv.id
        JOIN Product p ON pv.productId = p.id
        LEFT JOIN User u ON sm.userId = u.id
        ORDER BY sm.createdAt DESC
        LIMIT ?
      `
      return db.query(query, [limit])
    } catch (error) {
      console.error('Error getting recent stock movements:', error)
      throw error
    }
  })
  
  ipcMain.handle('stockMovements:bulkRecord', async (_, movements: any[]) => {
    try {
      db.transaction(() => {
        for (const movement of movements) {
          const id = crypto.randomUUID()
          db.execute(
            'INSERT INTO StockMovement (id, variantId, type, quantity, reason, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, movement.variantId, movement.type, movement.quantity, movement.reason || null, movement.userId, new Date().toISOString()]
          )
          
          // Update variant stock
          if (movement.type === 'RESTOCK' || movement.type === 'ADJUSTMENT_IN') {
            db.execute('UPDATE ProductVariant SET stock = stock + ? WHERE id = ?', [movement.quantity, movement.variantId])
          } else if (movement.type === 'STOCKOUT' || movement.type === 'ADJUSTMENT_OUT') {
            db.execute('UPDATE ProductVariant SET stock = stock - ? WHERE id = ?', [movement.quantity, movement.variantId])
          }
        }
      })
      
      return { success: true, count: movements.length }
    } catch (error) {
      console.error('Error bulk recording stock movements:', error)
      throw error
    }
  })
}
