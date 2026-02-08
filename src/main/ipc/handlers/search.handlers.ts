import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerSearchHandlers() {
  ipcMain.handle('search:products', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('search:inventory', async (_, searchTerm = '') => {
    try {
      const query = `
        SELECT 
          pv.id,
          pv.productId,
          p.name,
          pv.color,
          pv.size,
          pv.sku,
          pv.stock,
          pv.price
        FROM ProductVariant pv
        JOIN Product p ON pv.productId = p.id
        WHERE p.name LIKE ? OR pv.sku LIKE ? OR pv.barcode LIKE ?
        LIMIT 50
      `
      
      const searchPattern = `%${searchTerm}%`
      const results = db.query(query, [searchPattern, searchPattern, searchPattern])
      return results
    } catch (error) {
      console.error('Error searching inventory:', error)
      throw error
    }
  })
  
  ipcMain.handle('search:finance', async () => {
    try {
      // Return empty data for finance - not critical for now
      return {
        transactions: [],
        total: 0
      }
    } catch (error) {
      console.error('Error searching finance:', error)
      throw error
    }
  })
  
  ipcMain.handle('search:getFilterMetadata', async () => {
    try {
      // Return empty metadata - not critical for now
      return {
        categories: [],
        stores: [],
        suppliers: []
      }
    } catch (error) {
      console.error('Error getting filter metadata:', error)
      throw error
    }
  })
  
  ipcMain.handle('search:customers', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('search:sales', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('search:employees', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('search:suppliers', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
  
  ipcMain.handle('search:global', async () => {
    throw new Error('Not yet converted to better-sqlite3')
  })
}
