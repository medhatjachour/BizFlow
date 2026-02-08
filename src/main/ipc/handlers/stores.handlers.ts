/**
 * Stores IPC Handlers - better-sqlite3 Version
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerStoresHandlers() {
  ipcMain.handle('stores:getAll', async () => {
    try {
      return db.query('SELECT * FROM Store ORDER BY createdAt DESC')
    } catch (error) {
      console.error('Error fetching stores:', error)
      throw error
    }
  })

  ipcMain.handle('stores:create', async (_, storeData) => {
    try {
      const storeId = storeData.id || `store_${Date.now()}`
      
      db.execute(`
        INSERT INTO Store (id, name, location, address, phone, email, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        storeId,
        storeData.name,
        storeData.location || null,
        storeData.address || null,
        storeData.phone || null,
        storeData.email || null,
        new Date().toISOString(),
        new Date().toISOString()
      ])
      
      const store = db.queryOne('SELECT * FROM Store WHERE id = ?', [storeId])
      return { success: true, store }
    } catch (error: any) {
      console.error('Error creating store:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('stores:update', async (_, { id, storeData }) => {
    try {
      const sets: string[] = []
      const params: any[] = []
      
      if (storeData.name !== undefined) {
        sets.push('name = ?')
        params.push(storeData.name)
      }
      if (storeData.location !== undefined) {
        sets.push('location = ?')
        params.push(storeData.location)
      }
      if (storeData.address !== undefined) {
        sets.push('address = ?')
        params.push(storeData.address)
      }
      if (storeData.phone !== undefined) {
        sets.push('phone = ?')
        params.push(storeData.phone)
      }
      if (storeData.email !== undefined) {
        sets.push('email = ?')
        params.push(storeData.email)
      }
      
      sets.push('updatedAt = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      if (sets.length > 0) {
        db.execute(`UPDATE Store SET ${sets.join(', ')} WHERE id = ?`, params)
      }
      
      const store = db.queryOne('SELECT * FROM Store WHERE id = ?', [id])
      return { success: true, store }
    } catch (error: any) {
      console.error('Error updating store:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('stores:delete', async (_, id) => {
    try {
      db.execute('DELETE FROM Store WHERE id = ?', [id])
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting store:', error)
      return { success: false, message: error.message }
    }
  })
}
