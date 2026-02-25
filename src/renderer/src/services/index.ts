/**
 * Services Layer - Business Logic Abstraction
 * Follows Repository Pattern with Dependency Injection
 * Senior Engineer Pattern: Separation of Concerns
 */

import { Product } from '../../../shared/types'
import logger from '../../../shared/utils/logger'

// Extended types for services
interface Employee {
  id: string
  name: string
  role: string
  email: string
  phone: string
  address?: string
  status?: string
  performance?: number
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  loyaltyTier?: string
  totalSpent?: number
}

/**
 * Base Service Interface
 * All services implement this for consistency
 */
interface IBaseService<T> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(data: Omit<T, 'id'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

/**
 * IPC Communication Layer
 * Abstracts electron IPC from business logic
 */
class IPCClient {
  private static instance: IPCClient

  private constructor() {}

  static getInstance(): IPCClient {
    if (!IPCClient.instance) {
      IPCClient.instance = new IPCClient()
    }
    return IPCClient.instance
  }

  async invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
    try {
      // @ts-ignore - Electron API
      if (window.electron?.ipcRenderer) {
        // @ts-ignore
        return await window.electron.ipcRenderer.invoke(channel, ...args)
      }
      throw new Error('IPC not available')
    } catch (error) {
      logger.error(`IPC Error [${channel}]:`, error)
      throw error
    }
  }
}

/**
 * Product Service
 * Handles all product-related business logic
 */
export class ProductService implements IBaseService<Product> {
  private ipc = IPCClient.getInstance()
  private cache = new Map<string, { data: Product; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async getAll(): Promise<Product[]> {
    try {
      const products = await this.ipc.invoke<Product[]>('products:list')
      return products || []
    } catch (error) {
      logger.error('ProductService.getAll failed:', error)
      return this.getFallbackProducts()
    }
  }

  async getById(id: string): Promise<Product | null> {
    // Check cache first
    const cached = this.cache.get(id)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      const product = await this.ipc.invoke<Product>('products:get', { id })
      if (product) {
        this.cache.set(id, { data: product, timestamp: Date.now() })
      }
      return product
    } catch (error) {
      logger.error('ProductService.getById failed:', error)
      return null
    }
  }

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    try {
      const product = await this.ipc.invoke<Product>('products:create', data)
      return product
    } catch (error) {
      logger.error('ProductService.create failed:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    try {
      const product = await this.ipc.invoke<Product>('products:update', { id, ...data })
      // Invalidate cache
      this.cache.delete(id)
      return product
    } catch (error) {
      logger.error('ProductService.update failed:', error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.ipc.invoke('products:delete', { id })
      this.cache.delete(id)
    } catch (error) {
      logger.error('ProductService.delete failed:', error)
      throw error
    }
  }

  async search(query: string): Promise<Product[]> {
    try {
      const products = await this.getAll()
      return products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.baseSKU?.toLowerCase().includes(query.toLowerCase())
      )
    } catch (error) {
      logger.error('ProductService.search failed:', error)
      return []
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  private getFallbackProducts(): Product[] {
    const stored = localStorage.getItem('products')
    return stored ? JSON.parse(stored) : []
  }
}

/**
 * Employee Service
 */
export class EmployeeService implements IBaseService<Employee> {
  private ipc = IPCClient.getInstance()

  async getAll(): Promise<Employee[]> {
    try {
      const employees = await this.ipc.invoke<Employee[]>('employees:list')
      return employees || []
    } catch (error) {
      return this.getFallback()
    }
  }

  async getById(id: string): Promise<Employee | null> {
    try {
      return await this.ipc.invoke<Employee>('employees:get', { id })
    } catch (error) {
      return null
    }
  }

  async create(data: Omit<Employee, 'id'>): Promise<Employee> {
    return await this.ipc.invoke<Employee>('employees:create', data)
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    return await this.ipc.invoke<Employee>('employees:update', { id, ...data })
  }

  async delete(id: string): Promise<void> {
    await this.ipc.invoke('employees:delete', { id })
  }

  async getByRole(role: string): Promise<Employee[]> {
    const all = await this.getAll()
    return all.filter((e) => e.role === role)
  }

  private getFallback(): Employee[] {
    const stored = localStorage.getItem('employees')
    return stored ? JSON.parse(stored) : []
  }
}

/**
 * Customer Service
 */
export class CustomerService implements IBaseService<Customer> {
  private ipc = IPCClient.getInstance()

  async getAll(): Promise<Customer[]> {
    try {
      const customers = await this.ipc.invoke<Customer[]>('customers:list')
      return customers || []
    } catch (error) {
      return this.getFallback()
    }
  }

  async getById(id: string): Promise<Customer | null> {
    try {
      return await this.ipc.invoke<Customer>('customers:get', { id })
    } catch (error) {
      return null
    }
  }

  async create(data: Omit<Customer, 'id'>): Promise<Customer> {
    return await this.ipc.invoke<Customer>('customers:create', data)
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    return await this.ipc.invoke<Customer>('customers:update', { id, ...data })
  }

  async delete(id: string): Promise<void> {
    await this.ipc.invoke('customers:delete', { id })
  }

  async getByTier(tier: string): Promise<Customer[]> {
    const all = await this.getAll()
    return all.filter((c) => c.loyaltyTier === tier)
  }

  async search(query: string): Promise<Customer[]> {
    const all = await this.getAll()
    const q = query.toLowerCase()
    return all.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    )
  }

  private getFallback(): Customer[] {
    const stored = localStorage.getItem('customers')
    return stored ? JSON.parse(stored) : []
  }
}

/**
 * Analytics Service
 * Advanced analytics and reporting
 */
export class AnalyticsService {
  private ipc = IPCClient.getInstance()

  async getDashboardMetrics(dateRange?: { start: Date; end: Date }) {
    try {
      return await this.ipc.invoke('analytics:dashboard', dateRange)
    } catch (error) {
      return this.getMockMetrics()
    }
  }

  async getSalesReport(options: {
    startDate: Date
    endDate: Date
    groupBy?: 'day' | 'week' | 'month'
  }) {
    try {
      return await this.ipc.invoke('analytics:sales-report', options)
    } catch (error) {
      return { data: [], total: 0 }
    }
  }

  async getTopProducts(limit: number = 10) {
    try {
      return await this.ipc.invoke('analytics:top-products', { limit })
    } catch (error) {
      return []
    }
  }

  async getCustomerInsights() {
    try {
      return await this.ipc.invoke('analytics:customer-insights')
    } catch (error) {
      return null
    }
  }

  private getMockMetrics() {
    return {
      sales: 12345,
      orders: 123,
      profit: 4567,
      customers: 89
    }
  }
}

/**
 * Service Factory
 * Dependency Injection Container
 */
export class ServiceFactory {
  private static instances = new Map<string, any>()

  static getProductService(): ProductService {
    if (!this.instances.has('ProductService')) {
      this.instances.set('ProductService', new ProductService())
    }
    return this.instances.get('ProductService')
  }

  static getEmployeeService(): EmployeeService {
    if (!this.instances.has('EmployeeService')) {
      this.instances.set('EmployeeService', new EmployeeService())
    }
    return this.instances.get('EmployeeService')
  }

  static getCustomerService(): CustomerService {
    if (!this.instances.has('CustomerService')) {
      this.instances.set('CustomerService', new CustomerService())
    }
    return this.instances.get('CustomerService')
  }

  static getAnalyticsService(): AnalyticsService {
    if (!this.instances.has('AnalyticsService')) {
      this.instances.set('AnalyticsService', new AnalyticsService())
    }
    return this.instances.get('AnalyticsService')
  }

  static clearAll(): void {
    this.instances.clear()
  }
}

// Export singleton instances for convenience
export const productService = ServiceFactory.getProductService()
export const employeeService = ServiceFactory.getEmployeeService()
export const customerService = ServiceFactory.getCustomerService()
export const analyticsService = ServiceFactory.getAnalyticsService()
