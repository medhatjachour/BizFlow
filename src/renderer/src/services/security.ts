/**
 * Security & RBAC Layer
 * Enterprise-grade authentication and authorization
 * Senior Engineer Pattern: Defense in Depth
 */

import { Role } from '../../../shared/types'
import CryptoJS from 'crypto-js'
import logger from '../../../shared/utils/logger'

/**
 * Permission System
 * Define what each role can do
 */
export enum Permission {
  // Product permissions
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',

  // Employee permissions
  EMPLOYEE_VIEW = 'employee:view',
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',

  // Customer permissions
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',

  // Sale permissions
  SALE_VIEW = 'sale:view',
  SALE_CREATE = 'sale:create',
  SALE_UPDATE = 'sale:update',
  SALE_REFUND = 'sale:refund',

  // Report permissions
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  REPORT_FINANCIAL = 'report:financial',

  // System permissions
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_USERS = 'system:users',
}

/**
 * Role-Permission Mapping
 * Defines what each role can access
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.admin]: [
    // Admins have all permissions
    ...Object.values(Permission),
  ],
  [Role.manager]: [
    // Managers have most permissions except user management
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_DELETE,
    Permission.SALE_VIEW,
    Permission.SALE_CREATE,
    Permission.SALE_UPDATE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_FINANCIAL,
  ],
  [Role.sales]: [
    Permission.PRODUCT_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.SALE_VIEW,
    Permission.SALE_CREATE,
    Permission.REPORT_VIEW,
  ],
  [Role.inventory]: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.REPORT_VIEW,
  ],
  [Role.finance]: [
    Permission.PRODUCT_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.SALE_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_FINANCIAL,
  ],
}

/**
 * Authorization Service
 * Check if user has permission to perform action
 */
export class AuthorizationService {
  private static instance: AuthorizationService

  private constructor() {}

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService()
    }
    return AuthorizationService.instance
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole: Role, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole]
    return rolePermissions.includes(permission)
  }

  /**
   * Check if user has any of the given permissions
   */
  hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(userRole, permission))
  }

  /**
   * Check if user has all of the given permissions
   */
  hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
    return permissions.every((permission) => this.hasPermission(userRole, permission))
  }

  /**
   * Get all permissions for a role
   */
  getPermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Check if role can access route
   */
  canAccessRoute(userRole: Role, route: string): boolean {
    const routePermissions: Record<string, Permission[]> = {
      '/dashboard': [Permission.PRODUCT_VIEW],
      '/products': [Permission.PRODUCT_VIEW],
      '/inventory': [Permission.PRODUCT_VIEW],
      '/sales': [Permission.SALE_VIEW],
      '/pos': [Permission.SALE_CREATE],
      '/customers': [Permission.CUSTOMER_VIEW],
      '/employees': [Permission.EMPLOYEE_VIEW],
      '/finance': [Permission.REPORT_FINANCIAL],
      '/reports': [Permission.REPORT_VIEW],
      '/settings': [Permission.SYSTEM_SETTINGS],
    }

    const requiredPermissions = routePermissions[route]
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // Public route
    }

    return this.hasAnyPermission(userRole, requiredPermissions)
  }
}

/**
 * Encryption Service
 * Secure sensitive data in localStorage
 */
export class EncryptionService {
  private static instance: EncryptionService
  private readonly SECRET_KEY: string

  private constructor() {
    // In production, this should come from environment variable
    // For demo purposes, using a static key
    this.SECRET_KEY = process.env.ENCRYPTION_KEY || 'bizflow-secret-key-2024'
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService()
    }
    return EncryptionService.instance
  }

  /**
   * Encrypt data before storing
   */
  encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.SECRET_KEY).toString()
    } catch (error) {
      logger.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data after retrieving
   */
  decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.SECRET_KEY)
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      logger.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Encrypt object (converts to JSON first)
   */
  encryptObject<T>(obj: T): string {
    const jsonString = JSON.stringify(obj)
    return this.encrypt(jsonString)
  }

  /**
   * Decrypt object (parses JSON after decryption)
   */
  decryptObject<T>(encryptedData: string): T {
    const jsonString = this.decrypt(encryptedData)
    return JSON.parse(jsonString) as T
  }

  /**
   * Hash data (one-way, for passwords)
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  /**
   * Generate random token
   */
  generateToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString()
  }
}

/**
 * Secure Storage Service
 * Encrypted localStorage wrapper
 */
export class SecureStorageService {
  private static instance: SecureStorageService
  private encryption = EncryptionService.getInstance()

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService()
    }
    return SecureStorageService.instance
  }

  /**
   * Set encrypted item in storage
   */
  setItem<T>(key: string, value: T): void {
    try {
      const encrypted = this.encryption.encryptObject(value)
      localStorage.setItem(key, encrypted)
    } catch (error) {
      logger.error('SecureStorage.setItem failed:', error)
      throw error
    }
  }

  /**
   * Get and decrypt item from storage
   */
  getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null

      return this.encryption.decryptObject<T>(encrypted)
    } catch (error) {
      logger.error('SecureStorage.getItem failed:', error)
      return null
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * Clear all storage
   */
  clear(): void {
    localStorage.clear()
  }

  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null
  }
}

/**
 * Audit Logger
 * Track user actions for security compliance
 */
export class AuditLogger {
  private static instance: AuditLogger
  private logs: AuditLog[] = []
  private readonly MAX_LOGS = 1000

  private constructor() {
    this.loadLogs()
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Log an action
   */
  log(action: string, details: Record<string, any>, userId?: string): void {
    const logEntry: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      userId: userId || 'anonymous',
      details,
      ip: 'localhost', // In production, get actual IP
    }

    this.logs.push(logEntry)

    // Keep only last MAX_LOGS entries
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS)
    }

    this.saveLogs()
  }

  /**
   * Get all logs
   */
  getLogs(limit?: number): AuditLog[] {
    if (limit) {
      return this.logs.slice(-limit)
    }
    return this.logs
  }

  /**
   * Get logs by user
   */
  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter((log) => log.userId === userId)
  }

  /**
   * Get logs by action
   */
  getLogsByAction(action: string): AuditLog[] {
    return this.logs.filter((log) => log.action === action)
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
    this.saveLogs()
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem('audit_logs')
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (error) {
      logger.error('Failed to load audit logs:', error)
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem('audit_logs', JSON.stringify(this.logs))
    } catch (error) {
      logger.error('Failed to save audit logs:', error)
    }
  }
}

interface AuditLog {
  id: string
  timestamp: string
  action: string
  userId: string
  details: Record<string, any>
  ip: string
}

/**
 * Rate Limiter
 * Prevent abuse and DDoS
 */
export class RateLimiter {
  private static instance: RateLimiter
  private requests = new Map<string, number[]>()
  private readonly MAX_REQUESTS = 100 // per minute
  private readonly TIME_WINDOW = 60 * 1000 // 1 minute

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(identifier) || []

    // Remove old timestamps outside time window
    const validTimestamps = timestamps.filter((t) => now - t < this.TIME_WINDOW)

    if (validTimestamps.length >= this.MAX_REQUESTS) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(identifier, validTimestamps)
    return true
  }

  /**
   * Get remaining requests
   */
  getRemaining(identifier: string): number {
    const timestamps = this.requests.get(identifier) || []
    const now = Date.now()
    const validTimestamps = timestamps.filter((t) => now - t < this.TIME_WINDOW)
    return Math.max(0, this.MAX_REQUESTS - validTimestamps.length)
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

// Export singleton instances
export const authz = AuthorizationService.getInstance()
export const encryption = EncryptionService.getInstance()
export const secureStorage = SecureStorageService.getInstance()
export const auditLogger = AuditLogger.getInstance()
export const rateLimiter = RateLimiter.getInstance()
