/**
 * Authentication IPC Handlers
 * Handles user login and authentication
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'
import bcrypt from 'bcryptjs'

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (_, { username, password }) => {
    try {
      const user = db.queryOne<any>('SELECT * FROM User WHERE username = ?', [username])
      
      if (!user) {
        console.log(`❌ Login failed: User '${username}' not found`)
        return { success: false, message: 'Invalid username or password' }
      }

      const isValid = await bcrypt.compare(password, user.passwordHash)
      if (!isValid) {
        console.log(`❌ Login failed: Invalid password for user '${username}'`)
        return { success: false, message: 'Invalid username or password' }
      }

      // Check if user is active
      if (!user.isActive) {
        console.log(`❌ Login failed: User '${username}' is inactive`)
        return { success: false, message: 'Account is inactive. Contact administrator.' }
      }

      // Update last login time
      db.execute('UPDATE User SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), user.id])

      console.log(`✅ Login successful: ${user.username} (${user.role}) - ID: ${user.id}`)
      return { success: true, user: { id: user.id, username: user.username, role: user.role } }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { success: false, message: 'An error occurred during login' }
    }
  })

  // Create user (admin-only from UI) - exposed so production users can add accounts
  ipcMain.handle('auth:create', async (_, { username, password, role = 'sales' }) => {
    try {
      // validate input
      if (!username || !password) {
        return { success: false, message: 'Username and password are required' }
      }

      // ensure unique username
      const existing = db.queryOne<any>('SELECT * FROM User WHERE username = ?', [username])
      if (existing) {
        return { success: false, message: 'Username already exists' }
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const result = db.execute(
        'INSERT INTO User (username, passwordHash, role) VALUES (?, ?, ?)',
        [username, passwordHash, role]
      )

      return { 
        success: true, 
        user: { id: result.lastInsertRowid.toString(), username, role } 
      }
    } catch (error) {
      console.error('❌ Create user error:', error)
      return { success: false, message: 'Failed to create user' }
    }
  })
}
