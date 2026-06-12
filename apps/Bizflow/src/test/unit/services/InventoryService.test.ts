import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InventoryService } from '../../../main/services/InventoryService'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma client
const mockPrisma = {
  product: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn()
  },
  productVariant: {
    update: vi.fn()
  },
  sale: {
    findMany: vi.fn()
  },
  stockMovement: {
    findMany: vi.fn()
  },
  $queryRaw: vi.fn()
} as unknown as PrismaClient

describe('InventoryService', () => {
  let inventoryService: InventoryService

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    ;(InventoryService as any).instance = null
    inventoryService = InventoryService.getInstance(mockPrisma)
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = InventoryService.getInstance(mockPrisma)
      const instance2 = InventoryService.getInstance(mockPrisma)
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAllInventory', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        baseSKU: 'TEST001',
        category: 'Test Category',
        description: 'Test description',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          {
            id: 'v1',
            sku: 'TEST001-S',
            color: 'Red',
            size: 'S',
            price: 100,
            stock: 10,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        images: [],
        store: {
          id: 's1',
          name: 'Test Store',
          location: 'Test Location'
        }
      }
    ]

    it('should return all inventory items with default options', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.getAllInventory()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isArchived: false },
        include: {
          variants: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              sku: true,
              color: true,
              size: true,
              price: true,
              stock: true,
              createdAt: true,
              updatedAt: true
            }
          },
          images: false,
          store: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        },
        orderBy: { name: 'asc' },
        take: 1000
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('totalStock', 10)
    })

    it('should include images when requested', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      await inventoryService.getAllInventory({ includeImages: true })

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            images: { orderBy: { order: 'asc' } }
          })
        })
      )
    })

    it('should filter by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await inventoryService.getAllInventory({ category: 'Electronics' })

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isArchived: false,
            category: 'Electronics'
          }
        })
      )
    })

    it('should filter by search term', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await inventoryService.getAllInventory({ searchTerm: 'test' })

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isArchived: false,
            OR: [
              { name: { contains: 'test' } },
              { baseSKU: { contains: 'test' } },
              { description: { contains: 'test' } }
            ]
          }
        })
      )
    })
  })

  describe('getInventoryMetrics', () => {
    it('should return inventory metrics using raw SQL', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ total: 10, totalStock: 100n, totalValue: 5000 }])
        .mockResolvedValueOnce([{ count: 2 }])
        .mockResolvedValueOnce([{ count: 1 }])

      const result = await inventoryService.getInventoryMetrics()

      expect(result).toEqual({
        totalProducts: 5,
        totalVariants: 10,
        totalPieces: 100,
        totalStockValue: 3000, // 5000 * 0.6
        totalRetailValue: 5000,
        potentialProfit: 2000, // 5000 - 3000
        lowStockCount: 2,
        outOfStockCount: 1
      })
    })

    it('should handle zero values', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0, totalStock: 0n, totalValue: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])

      const result = await inventoryService.getInventoryMetrics()

      expect(result).toEqual({
        totalProducts: 0,
        totalVariants: 0,
        totalPieces: 0,
        totalStockValue: 0,
        totalRetailValue: 0,
        potentialProfit: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      })
    })
  })

  describe('getTopStockedItems', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Product A',
        baseSKU: 'A001',
        category: 'Test',
        description: 'Test',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          { id: 'v1', sku: 'A001-S', color: 'Red', size: 'S', price: 100, stock: 50, createdAt: new Date(), updatedAt: new Date() }
        ],
        images: [],
        store: { id: 's1', name: 'Store', location: 'Location' }
      },
      {
        id: '2',
        name: 'Product B',
        baseSKU: 'B001',
        category: 'Test',
        description: 'Test',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          { id: 'v2', sku: 'B001-S', color: 'Blue', size: 'S', price: 100, stock: 30, createdAt: new Date(), updatedAt: new Date() }
        ],
        images: [],
        store: { id: 's1', name: 'Store', location: 'Location' }
      }
    ]

    it('should return top stocked items sorted by total stock', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.getTopStockedItems(2)

      expect(result).toHaveLength(2)
      expect(result[0].totalStock).toBeGreaterThanOrEqual(result[1].totalStock)
    })

    it('should limit results to specified number', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.getTopStockedItems(1)

      expect(result).toHaveLength(1)
    })
  })

  describe('getLowStockItems', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Low Stock Product',
        baseSKU: 'LOW001',
        category: 'Test',
        description: 'Test',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          { id: 'v1', sku: 'LOW001-S', color: 'Red', size: 'S', price: 100, stock: 5, createdAt: new Date(), updatedAt: new Date() }
        ],
        images: [],
        store: { id: 's1', name: 'Store', location: 'Location' }
      }
    ]

    it('should return items with stock below threshold', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.getLowStockItems(10)

      expect(result).toHaveLength(1)
      expect(result[0].totalStock).toBeLessThanOrEqual(10)
      expect(result[0].totalStock).toBeGreaterThan(0)
    })

    it('should use default threshold of 10', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      await inventoryService.getLowStockItems()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            variants: {
              some: {
                stock: {
                  gt: 0,
                  lte: 10
                }
              }
            }
          }
        })
      )
    })
  })

  describe('getOutOfStockItems', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Out of Stock Product',
        baseSKU: 'OUT001',
        category: 'Test',
        description: 'Test',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          { id: 'v1', sku: 'OUT001-S', color: 'Red', size: 'S', price: 100, stock: 0, createdAt: new Date(), updatedAt: new Date() }
        ],
        images: [],
        store: { id: 's1', name: 'Store', location: 'Location' }
      }
    ]

    it('should return items with zero stock', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.getOutOfStockItems()

      expect(result).toHaveLength(1)
      expect(result[0].totalStock).toBe(0)
    })

    it('should query products where all variants have zero stock', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await inventoryService.getOutOfStockItems()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            variants: {
              every: {
                stock: 0
              }
            }
          }
        })
      )
    })
  })

  describe('getStockMovementHistory', () => {
    const mockStockMovements = [
      {
        id: 'sm1',
        variantId: 'v1',
        type: 'SALE',
        quantity: -2,
        previousStock: 10,
        newStock: 8,
        createdAt: new Date('2024-01-01'),
        userId: 'u1',
        notes: 'Sale transaction',
        user: { username: 'testuser' },
        productVariant: {
          id: 'v1',
          productId: 'p1'
        }
      }
    ]

    it('should return stock movements from sales', async () => {
      mockPrisma.stockMovement.findMany.mockResolvedValue(mockStockMovements)

      const result = await inventoryService.getStockMovementHistory('p1')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'sm1',
        productId: 'p1',
        variantId: 'v1',
        quantity: -2,
        type: 'SALE',
        timestamp: mockStockMovements[0].createdAt,
        userId: 'u1',
        notes: 'Sale transaction'
      })
    })

    it('should limit results to 50', async () => {
      mockPrisma.stockMovement.findMany.mockResolvedValue([])

      await inventoryService.getStockMovementHistory('p1')

      expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      )
    })
  })

  describe('searchInventory', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Search Product',
        baseSKU: 'SEARCH001',
        category: 'Test',
        description: 'Test description',
        basePrice: 100,
        baseCost: 60,
        isArchived: false,
        variants: [
          { id: 'v1', sku: 'SEARCH001-S', color: 'Red', size: 'S', price: 100, stock: 10, createdAt: new Date(), updatedAt: new Date() }
        ],
        images: [],
        store: { id: 's1', name: 'Store', location: 'Location' }
      }
    ]

    it('should search by name, SKU, category, and description', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts)

      const result = await inventoryService.searchInventory('test')

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test' } },
              { baseSKU: { contains: 'test' } },
              { category: { contains: 'test' } },
              { description: { contains: 'test' } }
            ]
          }
        })
      )
      expect(result).toHaveLength(1)
    })

    it('should convert search query to lowercase', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await inventoryService.searchInventory('TEST')

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test' } },
              { baseSKU: { contains: 'test' } },
              { category: { contains: 'test' } },
              { description: { contains: 'test' } }
            ]
          }
        })
      )
    })

    it('should limit search results to 100', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      await inventoryService.searchInventory('test')

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100
        })
      )
    })
  })

  describe('updateVariantStock', () => {
    it('should update variant stock', async () => {
      mockPrisma.productVariant.update.mockResolvedValue({
        id: 'v1',
        stock: 25
      })

      await inventoryService.updateVariantStock('v1', 25)

      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { stock: 25 }
      })
    })
  })
})