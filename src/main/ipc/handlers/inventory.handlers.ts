import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerInventoryHandlers() {
  ipcMain.handle('inventory:getLowStock', async (_, threshold = 10) => {
    try {
      const query = `
        SELECT 
          pv.id,
          pv.productId,
          p.name as productName,
          pv.color,
          pv.size,
          pv.stock,
          pv.reorderPoint
        FROM ProductVariant pv
        JOIN Product p ON pv.productId = p.id
        WHERE pv.stock <= ? OR pv.stock <= pv.reorderPoint
        ORDER BY pv.stock ASC
        LIMIT 50
      `
      
      const lowStockItems = db.query(query, [threshold])
      return lowStockItems
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      throw error
    }
  })
  
  ipcMain.handle('inventory:getOutOfStock', async () => {
    try {
      const query = `
        SELECT 
          pv.id,
          pv.productId,
          p.name as productName,
          pv.color,
          pv.size,
          pv.stock,
          pv.reorderPoint
        FROM ProductVariant pv
        JOIN Product p ON pv.productId = p.id
        WHERE pv.stock = 0
        ORDER BY p.name ASC
        LIMIT 100
      `
      
      const outOfStockItems = db.query(query)
      return outOfStockItems
    } catch (error) {
      console.error('Error fetching out of stock items:', error)
      throw error
    }
  })
  
  ipcMain.handle('inventory:getAll', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('inventory:getByProduct', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('inventory:adjustStock', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
}
