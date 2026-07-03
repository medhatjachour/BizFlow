/**
 * Authentication IPC Handlers
 * Handles user login and authentication
 */

import { ipcMain } from 'electron'
import bcrypt from 'bcryptjs'
import { createLogger } from '../../utils/logger'
import { bindUser, setCurrentUser } from './session'

const log = createLogger('Auth')

export function registerAuthHandlers(prisma: any) {
  ipcMain.handle('auth:login', async (_, { username, password }) => {
    try {
      if (prisma) {
        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) {
          log.info(`❌ Login failed: User '${username}' not found`)
          return { success: false, message: 'Invalid username or password' }
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          log.info(`❌ Login failed: Invalid password for user '${username}'`)
          return { success: false, message: 'Invalid username or password' }
        }

        // Check if user is active
        if (!user.isActive) {
          log.info(`❌ Login failed: User '${username}' is inactive`)
          return { success: false, message: 'Account is inactive. Contact administrator.' }
        }

        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        log.info(`✅ Login successful: ${user.username} (${user.role}) - ID: ${user.id}`)
        // Bind the acting user so sensitive handlers can enforce permissions.
        const capabilities = await bindUser(prisma, { id: user.id, username: user.username, role: user.role })
        return { success: true, user: { id: user.id, username: user.username, role: user.role }, capabilities }
      }

      // Mock fallback
      log.warn('⚠️ Using mock login - database not available')
      return { success: true, user: { id: '1', username, role: 'admin' } }
    } catch (error) {
      log.error('❌ Login error:', error)
      return { success: false, message: 'An error occurred during login' }
    }
  })

  // Whether the default 'setup' bootstrap account still exists and is active.
  // The login screen uses this to show/hide the "Use Setup Account" shortcut.
  ipcMain.handle('auth:setupExists', async () => {
    try {
      if (!prisma) return false
      const u = await prisma.user.findUnique({ where: { username: 'setup' }, select: { id: true, isActive: true } })
      return !!(u && u.isActive)
    } catch (error) {
      log.error('setupExists error:', error)
      return false
    }
  })

  // Create user (admin-only from UI) - exposed so production users can add accounts
  ipcMain.handle('auth:create', async (_, { username, password, role = 'sales' }) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      // validate input
      if (!username || !password) return { success: false, message: 'Username and password are required' }

      // ensure unique username
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) return { success: false, message: 'Username already exists' }

      const passwordHash = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({ data: { username, passwordHash, role } })

      return { success: true, user: { id: user.id, username: user.username, role: user.role } }
    } catch (error) {
      log.error('❌ Create user error:', error)
      return { success: false, message: 'Failed to create user' }
    }
  })

  // Clear the bound session on logout.
  ipcMain.handle('auth:logout', async () => {
    setCurrentUser(null)
    return { success: true }
  })
}
