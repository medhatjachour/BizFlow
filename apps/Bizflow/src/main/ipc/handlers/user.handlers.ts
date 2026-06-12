/**
 * User Management IPC Handlers
 * Handles user CRUD operations, password changes, and authentication
 */

import { ipcMain } from 'electron'
import * as bcrypt from 'bcryptjs'
import { createLogger } from '../../utils/logger'

const log = createLogger('Users')

export function registerUserHandlers(prisma: any) {
  // Get all users
  ipcMain.handle('users:getAll', async () => {
    try {
      const users = await prisma.user.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          username: true,
          role: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return { success: true, data: users }
    } catch (error) {
      log.error('[Users] Failed to get users:', error)
      return { success: false, error: 'Failed to load users' }
    }
  })

  // Get user by ID
  ipcMain.handle('users:getById', async (_event, userId: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      return { success: true, data: user }
    } catch (error) {
      log.error('[Users] Failed to get user:', error)
      return { success: false, error: 'Failed to load user' }
    }
  })

  // Create new user
  ipcMain.handle('users:create', async (_event, userData: {
    username: string
    password: string
    fullName?: string | null
    email?: string | null
    phone?: string | null
    role: string
  }) => {
    try {
      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username }
      })

      if (existingUser) {
        return { success: false, error: 'Username already exists' }
      }

      // Check if email already exists (if provided)
      if (userData.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: userData.email }
        })

        if (existingEmail) {
          return { success: false, error: 'Email already in use' }
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          passwordHash,
          fullName: userData.fullName || null,
          email: userData.email || null,
          phone: userData.phone || null,
          role: userData.role,
          isActive: true
        },
        select: {
          id: true,
          username: true,
          role: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true
        }
      })

      return { success: true, data: user }
    } catch (error) {
      log.error('[Users] Failed to create user:', error)
      return { success: false, error: 'Failed to create user' }
    }
  })

  // Update user
  ipcMain.handle('users:update', async (_event, userId: string, updateData: {
    fullName?: string | null
    email?: string | null
    phone?: string | null
    role?: string
    isActive?: boolean
  }) => {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        return { success: false, error: 'User not found' }
      }

      // Check if email is being changed and is already in use
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailInUse = await prisma.user.findFirst({
          where: {
            email: updateData.email,
            NOT: { id: userId }
          }
        })

        if (emailInUse) {
          return { success: false, error: 'Email already in use' }
        }
      }

      // Update user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: updateData.fullName !== undefined ? updateData.fullName : undefined,
          email: updateData.email !== undefined ? updateData.email : undefined,
          phone: updateData.phone !== undefined ? updateData.phone : undefined,
          role: updateData.role,
          isActive: updateData.isActive
        },
        select: {
          id: true,
          username: true,
          role: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          updatedAt: true
        }
      })

      return { success: true, data: user }
    } catch (error) {
      log.error('[Users] Failed to update user:', error)
      return { success: false, error: 'Failed to update user' }
    }
  })

  // Change password
  ipcMain.handle('users:changePassword', async (_event, userId: string, newPassword: string) => {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        return { success: false, error: 'User not found' }
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      })

      return { success: true }
    } catch (error) {
      log.error('[Users] Failed to change password:', error)
      return { success: false, error: 'Failed to change password' }
    }
  })

  // Delete user
  ipcMain.handle('users:delete', async (_event, userId: string) => {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        return { success: false, error: 'User not found' }
      }

      // Prevent deleting the last admin
      if (existingUser.role === 'admin') {
        const adminCount = await prisma.user.count({
          where: { role: 'admin', isActive: true }
        })

        if (adminCount <= 1) {
          return { success: false, error: 'Cannot delete the last admin user' }
        }
      }

      // Use transaction to delete user and all related records
      await prisma.$transaction(async (tx: any) => {
        // Delete related sale transactions first
        await tx.saleTransaction.deleteMany({
          where: { userId }
        })

        // Delete related old sales
        await tx.sale.deleteMany({
          where: { userId }
        })

        // Delete related financial transactions
        await tx.financialTransaction.deleteMany({
          where: { userId }
        })

        // Finally delete the user
        await tx.user.delete({
          where: { id: userId }
        })
      })

      return { success: true }
    } catch (error) {
      log.error('[Users] Failed to delete user:', error)
      return { success: false, error: 'Failed to delete user. Please try again.' }
    }
  })

  // Update last login
  ipcMain.handle('users:updateLastLogin', async (_event, userId: string) => {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() }
      })

      return { success: true }
    } catch (error) {
      log.error('[Users] Failed to update last login:', error)
      return { success: false, error: 'Failed to update last login' }
    }
  })
}
