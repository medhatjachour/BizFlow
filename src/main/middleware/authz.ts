/**
 * Authorization Middleware for IPC Handlers
 * Enforces role-based access control on the backend
 * 
 * Security: Frontend checks can be bypassed via DevTools,
 * so we must validate permissions in the main process
 */

import type { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger'

const log = createLogger('Authz')

// Permission enum matching frontend
export enum Permission {
  // Product permissions
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  
  // Employee permissions
  EMPLOYEE_VIEW = 'EMPLOYEE_VIEW',
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE = 'EMPLOYEE_DELETE',
  
  // Customer permissions
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  CUSTOMER_CREATE = 'CUSTOMER_CREATE',
  CUSTOMER_UPDATE = 'CUSTOMER_UPDATE',
  CUSTOMER_DELETE = 'CUSTOMER_DELETE',
  
  // Sale permissions
  SALE_VIEW = 'SALE_VIEW',
  SALE_CREATE = 'SALE_CREATE',
  SALE_REFUND = 'SALE_REFUND',
  
  // Report permissions
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_EXPORT = 'REPORT_EXPORT',
  
  // System permissions
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
}

// Role definitions
export enum Role {
  admin = 'admin',
  sales = 'sales',
  inventory = 'inventory',
  finance = 'finance',
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.admin]: Object.values(Permission), // Admins have all permissions
  
  [Role.sales]: [
    Permission.PRODUCT_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.SALE_VIEW,
    Permission.SALE_CREATE,
  ],
  
  [Role.inventory]: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.SALE_VIEW,
  ],
  
  [Role.finance]: [
    Permission.PRODUCT_VIEW,
    Permission.SALE_VIEW,
    Permission.SALE_REFUND,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as Role]
  if (!rolePermissions) return false
  return rolePermissions.includes(permission)
}

/**
 * Cache for user permissions to avoid repeated DB queries
 */
class PermissionCache {
  private cache = new Map<string, { role: string; timestamp: number }>()
  private TTL = 5 * 60 * 1000 // 5 minutes

  get(userId: string): string | null {
    const cached = this.cache.get(userId)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(userId)
      return null
    }
    
    return cached.role
  }

  set(userId: string, role: string): void {
    this.cache.set(userId, { role, timestamp: Date.now() })
  }

  clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }
}

const permissionCache = new PermissionCache()

/**
 * Get user role from database with caching
 */
async function getUserRole(prisma: PrismaClient, userId: string): Promise<string | null> {
  // Check cache first
  const cached = permissionCache.get(userId)
  if (cached) return cached
  
  // Query database
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (user) {
      permissionCache.set(userId, user.role)
      return user.role
    }
  } catch (error) {
    log.error('[Authz] Error fetching user role:', error)
  }
  
  return null
}

/**
 * Authorization middleware factory
 * Usage: ipcMain.handle('products:delete', requirePermission(prisma, Permission.PRODUCT_DELETE), handler)
 */
export function requirePermission(
  prisma: PrismaClient,
  permission: Permission
) {
  return (handler: Function) => {
    return async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
      // Extract userId from request
      // Assuming first argument contains userId or it's passed separately
      const userId = extractUserId(args)
      
      if (!userId) {
        log.error('[Authz] No userId provided in request')
        throw new Error('Authentication required')
      }
      
      // Get user role
      const role = await getUserRole(prisma, userId)
      
      if (!role) {
        log.error('[Authz] User not found:', userId)
        throw new Error('User not found')
      }
      
      // Check permission
      if (!hasPermission(role, permission)) {
        log.warn(`[Authz] Permission denied: ${role} lacks ${permission}`)
        throw new Error(`Insufficient permissions: ${permission} required`)
      }
      
      // Permission granted, execute handler
      return handler(event, ...args)
    }
  }
}

/**
 * Extract userId from IPC arguments
 * Supports multiple patterns:
 * - Direct userId as first arg
 * - Object with userId property
 * - Data object with nested userId
 */
function extractUserId(args: any[]): string | null {
  if (!args.length) return null
  
  const firstArg = args[0]
  
  // Direct string userId
  if (typeof firstArg === 'string') {
    return firstArg
  }
  
  // Object with userId
  if (firstArg && typeof firstArg === 'object') {
    if (firstArg.userId) return firstArg.userId
    if (firstArg.data?.userId) return firstArg.data.userId
  }
  
  return null
}

/**
 * Optional: Middleware for operations that don't require specific permissions
 * but need authentication
 */
export function requireAuth(prisma: PrismaClient) {
  return (handler: Function) => {
    return async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
      const userId = extractUserId(args)
      
      if (!userId) {
        throw new Error('Authentication required')
      }
      
      const role = await getUserRole(prisma, userId)
      
      if (!role) {
        throw new Error('User not found')
      }
      
      return handler(event, ...args)
    }
  }
}

/**
 * Clear permission cache (useful after role changes)
 */
export function clearPermissionCache(userId?: string): void {
  permissionCache.clear(userId)
}
