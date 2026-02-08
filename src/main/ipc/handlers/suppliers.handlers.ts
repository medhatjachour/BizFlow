import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerSupplierHandlers() {
  ipcMain.handle('suppliers:getAll', async () => {
    try {
      return db.query('SELECT * FROM Supplier ORDER BY name')
    } catch (error) {
      console.error('Error getting all suppliers:', error)
      throw error
    }
  })
  
  ipcMain.handle('suppliers:getById', async (_, id: string) => {
    try {
      return db.queryOne('SELECT * FROM Supplier WHERE id = ?', [id])
    } catch (error) {
      console.error('Error getting supplier by ID:', error)
      throw error
    }
  })
  
  ipcMain.handle('suppliers:create', async (_, data: any) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO Supplier (id, name, contactPerson, email, phone, address, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.name, data.contactPerson || null, data.email || null, data.phone || null, data.address || null, new Date().toISOString()]
      )
      return db.queryOne('SELECT * FROM Supplier WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating supplier:', error)
      throw error
    }
  })
  
  ipcMain.handle('suppliers:update', async (_, id: string, updates: any) => {
    try {
      const setParts: string[] = []
      const values: any[] = []
      
      if (updates.name !== undefined) {
        setParts.push('name = ?')
        values.push(updates.name)
      }
      if (updates.contactPerson !== undefined) {
        setParts.push('contactPerson = ?')
        values.push(updates.contactPerson)
      }
      if (updates.email !== undefined) {
        setParts.push('email = ?')
        values.push(updates.email)
      }
      if (updates.phone !== undefined) {
        setParts.push('phone = ?')
        values.push(updates.phone)
      }
      if (updates.address !== undefined) {
        setParts.push('address = ?')
        values.push(updates.address)
      }
      
      if (setParts.length > 0) {
        values.push(id)
        db.execute(`UPDATE Supplier SET ${setParts.join(', ')} WHERE id = ?`, values)
      }
      
      return db.queryOne('SELECT * FROM Supplier WHERE id = ?', [id])
    } catch (error) {
      console.error('Error updating supplier:', error)
      throw error
    }
  })
  
  ipcMain.handle('suppliers:delete', async (_, id: string) => {
    try {
      db.execute('DELETE FROM Supplier WHERE id = ?', [id])
      return { success: true }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      throw error
    }
  })
}
