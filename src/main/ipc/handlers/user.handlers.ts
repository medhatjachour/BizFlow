import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'
import bcrypt from 'bcryptjs'

export function registerUserHandlers() {
  ipcMain.handle('users:getAll', async () => {
    try {
      return db.query('SELECT id, username, email, role, isActive, createdAt, lastLoginAt FROM User ORDER BY username')
    } catch (error) {
      console.error('Error getting all users:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:getById', async (_, userId: string) => {
    try {
      return db.queryOne('SELECT id, username, email, role, isActive, createdAt, lastLoginAt FROM User WHERE id = ?', [userId])
    } catch (error) {
      console.error('Error getting user by ID:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:create', async (_, userData: { username: string; email: string; password: string; role: string }) => {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      const userId = crypto.randomUUID()
      
      db.execute(
        'INSERT INTO User (id, username, email, password, role, isActive, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)',
        [userId, userData.username, userData.email, hashedPassword, userData.role, new Date().toISOString()]
      )
      
      return db.queryOne('SELECT id, username, email, role, isActive, createdAt FROM User WHERE id = ?', [userId])
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:update', async (_, userId: string, updates: { username?: string; email?: string; role?: string; isActive?: boolean }) => {
    try {
      const setParts: string[] = []
      const values: any[] = []
      
      if (updates.username !== undefined) {
        setParts.push('username = ?')
        values.push(updates.username)
      }
      if (updates.email !== undefined) {
        setParts.push('email = ?')
        values.push(updates.email)
      }
      if (updates.role !== undefined) {
        setParts.push('role = ?')
        values.push(updates.role)
      }
      if (updates.isActive !== undefined) {
        setParts.push('isActive = ?')
        values.push(updates.isActive ? 1 : 0)
      }
      
      if (setParts.length === 0) {
        return db.queryOne('SELECT id, username, email, role, isActive, createdAt FROM User WHERE id = ?', [userId])
      }
      
      values.push(userId)
      db.execute(`UPDATE User SET ${setParts.join(', ')} WHERE id = ?`, values)
      
      return db.queryOne('SELECT id, username, email, role, isActive, createdAt FROM User WHERE id = ?', [userId])
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:changePassword', async (_, userId: string, newPassword: string) => {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      db.execute('UPDATE User SET password = ? WHERE id = ?', [hashedPassword, userId])
      return { success: true }
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:delete', async (_, userId: string) => {
    try {
      db.execute('UPDATE User SET isActive = 0, deactivatedAt = ? WHERE id = ?', [new Date().toISOString(), userId])
      return { success: true }
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  })
  
  ipcMain.handle('users:updateLastLogin', async (_, userId: string) => {
    try {
      db.execute('UPDATE User SET lastLoginAt = ? WHERE id = ?', [new Date().toISOString(), userId])
      return { success: true }
    } catch (error) {
      console.error('Error updating last login:', error)
      throw error
    }
  })
}
