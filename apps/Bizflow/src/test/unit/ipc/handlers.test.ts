/**
 * IPC Handlers Unit Tests
 * Tests for main process IPC handlers registration and basic functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-path')
  }
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn()
  }
}))

// Mock ImageService to avoid path issues
vi.mock('../../../main/services/ImageService', () => ({
  getImageService: vi.fn(() => ({
    ensureImageDirectory: vi.fn().mockResolvedValue('/tmp/images'),
    saveImage: vi.fn().mockResolvedValue('image.jpg'),
    deleteImage: vi.fn().mockResolvedValue(true)
  }))
}))

describe('IPC Handlers Registration', () => {
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPrisma = {
      user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
      product: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      productVariant: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
      store: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      sale: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
      saleTransaction: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
      saleItem: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
      inventory: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
      finance: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
      employee: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      customer: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      supplier: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
      purchaseOrder: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
      stockMovement: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
      deposit: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
      installment: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
      receipt: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
      $queryRaw: vi.fn(),
      $transaction: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Handler Registration', () => {
    it('should register auth handlers', async () => {
      const { registerAuthHandlers } = await import('../../../main/ipc/handlers/auth.handlers')
      registerAuthHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('auth:login', expect.any(Function))
    })

    it('should register product handlers', async () => {
      const { registerProductsHandlers } = await import('../../../main/ipc/handlers/products.handlers')
      registerProductsHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('products:getAll', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('products:create', expect.any(Function))
    })

    it('should register category handlers', async () => {
      const { registerCategoriesHandlers } = await import('../../../main/ipc/handlers/categories.handlers')
      registerCategoriesHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('categories:getAll', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('categories:create', expect.any(Function))
    })

    it('should register store handlers', async () => {
      const { registerStoresHandlers } = await import('../../../main/ipc/handlers/stores.handlers')
      registerStoresHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('stores:getAll', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('stores:create', expect.any(Function))
    })

    it('should register sales handlers', async () => {
      const { registerSalesHandlers } = await import('../../../main/ipc/handlers/sales.handlers')
      registerSalesHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('sales:create', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sales:getAll', expect.any(Function))
    })

    it('should register dashboard handlers', async () => {
      const { registerDashboardHandlers } = await import('../../../main/ipc/handlers/dashboard.handlers')
      registerDashboardHandlers(mockPrisma)
      expect(ipcMain.handle).toHaveBeenCalledWith('dashboard:getMetrics', expect.any(Function))
    })
  })

  describe('Basic Handler Functionality', () => {
    it('should handle successful login', async () => {
      const { registerAuthHandlers } = await import('../../../main/ipc/handlers/auth.handlers')

      const mockUser = { id: 1, username: 'admin', passwordHash: 'hash', role: 'admin', isActive: true }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const bcrypt = await import('bcryptjs')
      ;(bcrypt.default.compare as any).mockResolvedValue(true)

      registerAuthHandlers(mockPrisma)
      const loginCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'auth:login')
      const result = await loginCall[1](null, { username: 'admin', password: 'pass' })

      expect(result.success).toBe(true)
      expect(result.user.username).toBe('admin')
    })

    it('should handle product creation', async () => {
      const { registerProductsHandlers } = await import('../../../main/ipc/handlers/products.handlers')

      const newProduct = {
        name: 'Test Product',
        description: 'Test Description',
        basePrice: 100,
        hasVariants: false,
        baseSKU: 'TEST-001',
        categoryId: 'cat-1',
        storeId: 'store-1',
        images: [], // Add empty images array
        variants: []
      }

    mockPrisma.productVariant.findUnique.mockResolvedValue(null) // No existing SKU
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Test Category' })
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        ...mockPrisma,
        product: {
          ...mockPrisma.product,
          create: vi.fn().mockResolvedValue({
            id: 'prod-1',
            ...newProduct,
            images: [], // Empty images array as returned by include
            variants: [], // Empty variants array as returned by include
            store: { id: 'store-1', name: 'Test Store' }, // Included store
            category: { id: 'cat-1', name: 'Test Category' } // Included category
          })
        }
      }
      return await callback(tx)
    })

      registerProductsHandlers(mockPrisma)
      const createCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'products:create')
      const result = await createCall[1](null, newProduct)

      expect(result.success).toBe(true)
      expect(result.product.name).toBe('Test Product')
    })

    it('should handle category retrieval', async () => {
      const { registerCategoriesHandlers } = await import('../../../main/ipc/handlers/categories.handlers')

      const mockCategories = [
        { id: 1, name: 'Electronics', _count: { products: 5 } },
        { id: 2, name: 'Clothing', _count: { products: 3 } }
      ]
      mockPrisma.category.findMany.mockResolvedValue(mockCategories)

      registerCategoriesHandlers(mockPrisma)
      const getCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'categories:getAll')
      const result = await getCall[1](null)

      expect(result.success).toBe(true)
      expect(result.categories).toHaveLength(2)
      expect(result.categories[0].productCount).toBe(5)
    })

    it('should handle store creation', async () => {
      const { registerStoresHandlers } = await import('../../../main/ipc/handlers/stores.handlers')

      const newStore = { name: 'New Store', location: 'Downtown' }
      const createdStore = { id: 1, ...newStore, isActive: true }

      mockPrisma.store.create.mockResolvedValue(createdStore)
      registerStoresHandlers(mockPrisma)

      const createCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'stores:create')
      const result = await createCall[1](null, newStore)

      expect(result.success).toBe(true)
      expect(result.store.name).toBe('New Store')
    })

    it('should handle dashboard metrics', async () => {
      const { registerDashboardHandlers } = await import('../../../main/ipc/handlers/dashboard.handlers')

      mockPrisma.saleTransaction.aggregate.mockResolvedValue({ 
        _sum: { total: 15000 }, 
        _count: 10 
      })
      mockPrisma.$queryRaw.mockResolvedValue([{ profit: 5000 }])

      registerDashboardHandlers(mockPrisma)
      const metricsCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'dashboard:getMetrics')
      const result = await metricsCall[1](null)

      expect(result.sales).toBe(15000)
      expect(result.orders).toBe(10)
      expect(result.profit).toBe(5000)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { registerProductsHandlers } = await import('../../../main/ipc/handlers/products.handlers')

      // Mock prisma as null to simulate database not available
      const nullPrisma = null
      registerProductsHandlers(nullPrisma)

      const getCall = (ipcMain.handle as any).mock.calls.find(call => call[0] === 'products:getAll')
      const result = await getCall[1](null, { page: 1, limit: 10 })

      expect(result).toEqual([]) // Handler returns empty array when prisma is null
    })
  })
})