/**
 * Unit tests for ProductService
 * Tests product business logic and service layer functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductService } from '../../../main/services/ProductService'
import { ProductServiceError } from '../../../main/services/ProductService'
import { EntityNotFoundError, DuplicateEntityError } from '../../../shared/interfaces/IRepository'
import { ProductRepository } from '../../../main/repositories/ProductRepository'
import { eventBus } from '../../../shared/events/EventBus'
import type { PrismaClient } from '@prisma/client'

// Mock dependencies
vi.mock('../../../main/repositories/ProductRepository')
vi.mock('../../../shared/events/EventBus')
vi.mock('../../../shared/utils/logger')

const mockProductRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findBySKU: vi.fn(),
  findAll: vi.fn(),
  findPaginated: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateVariantStock: vi.fn(),
  findLowStock: vi.fn(),
  findOutOfStock: vi.fn(),
  getCategories: vi.fn(),
  addImage: vi.fn(),
  deleteImage: vi.fn(),
  search: vi.fn(),
}

const mockPrisma = {} as PrismaClient
const mockEventBus = {
  emit: vi.fn(),
}

describe('ProductService', () => {
  let productService: ProductService

  beforeEach(() => {
    vi.clearAllMocks()
    ;(ProductRepository as any).mockImplementation(() => mockProductRepository)
    ;(eventBus as any).emit = mockEventBus.emit

    // Setup default mocks
    mockProductRepository.findBySKU.mockResolvedValue(null) // No existing product by default
    mockProductRepository.findById.mockResolvedValue(null) // No product found by default

    productService = new ProductService(mockPrisma)
  })

  describe('createProduct', () => {
    const validProductDTO = {
      name: 'Test Product',
      baseSKU: 'TEST-001',
      basePrice: 29.99,
      baseCost: 19.99,
      category: 'Electronics',
      description: 'A test product',
      hasVariants: false,
      variants: [],
      images: [],
    }

    it('should create product successfully', async () => {
      const mockProduct = { 
        id: '1', 
        ...validProductDTO,
        variants: [],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockProductRepository.create.mockResolvedValue(mockProduct)

      const result = await productService.createProduct(validProductDTO)

      expect(mockProductRepository.create).toHaveBeenCalledWith(validProductDTO)
      expect(mockEventBus.emit).toHaveBeenCalledWith('product:created', {
        productId: '1',
        sku: 'TEST-001'
      })
      expect(result).toBeDefined()
    })

    it('should throw ProductServiceError on duplicate SKU', async () => {
      const duplicateError = new DuplicateEntityError('Product', 'SKU', 'TEST-001')
      mockProductRepository.findBySKU.mockResolvedValue({ id: 'existing' })
      mockProductRepository.create.mockRejectedValue(duplicateError)

      await expect(productService.createProduct(validProductDTO))
        .rejects.toThrow(DuplicateEntityError)
      expect(mockEventBus.emit).not.toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      const invalidDTO = { ...validProductDTO, name: '' }
      mockProductRepository.create.mockRejectedValue(new Error('Validation failed'))

      await expect(productService.createProduct(invalidDTO))
        .rejects.toThrow(ProductServiceError)
    })
  })

  describe('getProduct', () => {
    it('should return product when found', async () => {
      const mockProduct = { 
        id: '1', 
        name: 'Test Product',
        variants: [{ 
          id: 'v1',
          stock: 10, 
          price: 29.99,
          sku: 'TEST-001',
          color: null,
          size: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockProductRepository.findById.mockResolvedValue(mockProduct)

      const result = await productService.getProduct('1')

      expect(mockProductRepository.findById).toHaveBeenCalledWith('1')
      expect(result).toBeDefined()
    })

    it('should throw ProductServiceError when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null)

      await expect(productService.getProduct('999'))
        .rejects.toThrow(EntityNotFoundError)
    })
  })

  describe('getProductBySKU', () => {
    it('should return product by SKU', async () => {
      const mockProduct = { 
        id: '1', 
        baseSKU: 'TEST-001', 
        name: 'Test Product',
        basePrice: 29.99,
        baseCost: 19.99,
        category: 'Electronics',
        description: 'A test product',
        hasVariants: false,
        variants: [{
          id: 'v1',
          stock: 10,
          price: 29.99,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockProductRepository.findBySKU.mockResolvedValue(mockProduct)

      const result = await productService.getProductBySKU('TEST-001')

      expect(mockProductRepository.findBySKU).toHaveBeenCalledWith('TEST-001')
      expect(result.id).toBe('1')
    })

    it('should throw ProductServiceError when SKU not found', async () => {
      const notFoundError = new EntityNotFoundError('Product', 'INVALID-SKU')
      mockProductRepository.findBySKU.mockRejectedValue(notFoundError)

      await expect(productService.getProductBySKU('INVALID-SKU'))
        .rejects.toThrow(EntityNotFoundError)
    })
  })

  describe('queryProducts', () => {
    const queryDTO = {
      page: 1,
      limit: 10,
      search: 'test',
      category: 'Electronics',
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
    }

    it('should query products with filters', async () => {
      // Mock search results when search query is provided
      const mockSearchResults = [{ 
        id: '1', 
        name: 'Test Product',
        baseSKU: 'TEST-001',
        category: 'Electronics',
        description: 'Test',
        basePrice: 29.99,
        baseCost: 19.99,
        hasVariants: false,
        storeId: null,
        variants: [],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }]
      mockProductRepository.search.mockResolvedValue(mockSearchResults)

      const result = await productService.queryProducts(queryDTO)

      expect(mockProductRepository.search).toHaveBeenCalledWith('test')
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(1)
    })

    it('should handle empty results', async () => {
      mockProductRepository.search.mockResolvedValue([])

      const result = await productService.queryProducts(queryDTO)

      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('updateProduct', () => {
    const updateDTO = {
      name: 'Updated Product',
      basePrice: 39.99,
    }

    it('should update product successfully', async () => {
      const mockUpdatedProduct = { 
        id: '1', 
        name: 'Updated Product', 
        basePrice: 39.99,
        baseCost: 19.99,
        baseSKU: 'TEST-001',
        category: 'Electronics',
        description: 'A test product',
        hasVariants: false,
        variants: [{
          id: 'v1',
          stock: 10,
          price: 39.99,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      mockProductRepository.update.mockResolvedValue(mockUpdatedProduct)

      const result = await productService.updateProduct('1', updateDTO)

      expect(mockProductRepository.update).toHaveBeenCalledWith('1', updateDTO)
      expect(mockEventBus.emit).toHaveBeenCalledWith('product:updated', {
        productId: '1',
        changes: updateDTO
      })
      expect(result.name).toBe('Updated Product')
    })

    it('should throw error when product not found', async () => {
      const notFoundError = new EntityNotFoundError('Product', '999')
      mockProductRepository.update.mockRejectedValue(notFoundError)

      await expect(productService.updateProduct('999', updateDTO))
        .rejects.toThrow(EntityNotFoundError)
    })
  })

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockProductRepository.delete.mockResolvedValue(true)

      const result = await productService.deleteProduct('1')

      expect(mockProductRepository.delete).toHaveBeenCalledWith('1')
      expect(mockEventBus.emit).toHaveBeenCalledWith('product:deleted', { 
        productId: '1',
        sku: 'UNKNOWN'
      })
      expect(result).toBe(true)
    })

    it('should throw error when product not found', async () => {
      mockProductRepository.delete.mockResolvedValue(false)

      const result = await productService.deleteProduct('999')

      expect(result).toBe(false)
      expect(mockEventBus.emit).not.toHaveBeenCalled()
    })
  })

  describe('updateStock', () => {
    const stockUpdateDTO = {
      variantId: 'v1',
      stock: 5,
      reason: 'Restock',
    }

    it('should update stock successfully', async () => {
      mockProductRepository.updateVariantStock.mockResolvedValue(undefined)

      await expect(productService.updateStock(stockUpdateDTO)).resolves.toBeUndefined()

      expect(mockProductRepository.updateVariantStock).toHaveBeenCalledWith('v1', 5)
      expect(mockEventBus.emit).toHaveBeenCalledWith('stock:updated', {
        variantId: 'v1',
        oldStock: 0,
        newStock: 5
      })
    })

    it('should handle stock update errors', async () => {
      mockProductRepository.updateVariantStock.mockRejectedValue(new Error('Stock update failed'))

      await expect(productService.updateStock(stockUpdateDTO))
        .rejects.toThrow('Stock update failed')
    })
  })

  describe('bulkUpdateStock', () => {
    const bulkUpdateDTO = {
      updates: [
        { variantId: 'v1', stock: 10 },
        { variantId: 'v2', stock: 5 },
      ],
    }

    it('should bulk update stock successfully', async () => {
      mockProductRepository.updateVariantStock.mockResolvedValue(undefined)

      await expect(productService.bulkUpdateStock(bulkUpdateDTO)).resolves.toBeUndefined()

      expect(mockProductRepository.updateVariantStock).toHaveBeenCalledTimes(2)
      expect(mockProductRepository.updateVariantStock).toHaveBeenCalledWith('v1', 10)
      expect(mockProductRepository.updateVariantStock).toHaveBeenCalledWith('v2', 5)
    })
  })

  describe('getLowStockProducts', () => {
    it('should return low stock products', async () => {
      const mockProducts = [
        { 
          id: '1', 
          name: 'Low Stock Product',
          baseSKU: 'LOW-001',
          basePrice: 29.99,
          baseCost: 19.99,
          category: 'Electronics',
          description: 'A low stock product',
          hasVariants: false,
          variants: [{ 
            id: 'v1',
            stock: 5, 
            price: 29.99,
            createdAt: new Date(),
            updatedAt: new Date()
          }],
          images: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      mockProductRepository.findLowStock.mockResolvedValue(mockProducts)

      const result = await productService.getLowStockProducts(10)

      expect(mockProductRepository.findLowStock).toHaveBeenCalledWith(10)
      expect(result).toBeDefined()
    })

    it('should use default threshold', async () => {
      mockProductRepository.findLowStock.mockResolvedValue([])

      const result = await productService.getLowStockProducts()

      expect(mockProductRepository.findLowStock).toHaveBeenCalledWith(10)
      expect(result).toEqual([])
    })
  })

  describe('getOutOfStockProducts', () => {
    it('should return out of stock products', async () => {
      const mockProducts = [
        { 
          id: '1', 
          name: 'Out of Stock Product',
          baseSKU: 'OUT-001',
          basePrice: 29.99,
          baseCost: 19.99,
          category: 'Electronics',
          description: 'An out of stock product',
          hasVariants: false,
          variants: [{ 
            id: 'v1',
            stock: 0, 
            price: 29.99,
            createdAt: new Date(),
            updatedAt: new Date()
          }],
          images: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      mockProductRepository.findOutOfStock.mockResolvedValue(mockProducts)

      const result = await productService.getOutOfStockProducts()

      expect(mockProductRepository.findOutOfStock).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const mockCategories = ['Electronics', 'Clothing', 'Books']
      mockProductRepository.getCategories.mockResolvedValue(mockCategories)

      const result = await productService.getCategories()

      expect(mockProductRepository.getCategories).toHaveBeenCalled()
      expect(result).toEqual(mockCategories)
    })
  })

  describe('addImage', () => {
    it('should add image successfully', async () => {
      mockProductRepository.addImage.mockResolvedValue(undefined)

      await expect(productService.addImage('1', 'base64data', 1)).resolves.toBeUndefined()

      expect(mockProductRepository.addImage).toHaveBeenCalledWith('1', 'base64data', 1)
    })
  })

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      mockProductRepository.deleteImage.mockResolvedValue(undefined)

      await expect(productService.deleteImage('img1')).resolves.toBeUndefined()

      expect(mockProductRepository.deleteImage).toHaveBeenCalledWith('img1')
    })
  })

  describe('Error handling', () => {
    it('should wrap unknown errors in ProductServiceError', async () => {
      mockProductRepository.create.mockRejectedValue(new Error('Unknown error'))

      await expect(productService.createProduct({
        name: 'Test',
        baseSKU: 'TEST',
        basePrice: 10,
        baseCost: 5,
        category: 'Test',
        hasVariants: false,
        variants: [],
        images: []
      }))
        .rejects.toThrow('Failed to create product: Unknown error')
    })

    it('should preserve error codes when available', async () => {
      const customError = new Error('Custom error')
      ;(customError as any).code = 'CUSTOM_ERROR'
      mockProductRepository.create.mockRejectedValue(customError)

      try {
        await productService.createProduct({
          name: 'Test',
          baseSKU: 'TEST',
          basePrice: 10,
          baseCost: 5,
          category: 'Test',
          hasVariants: false,
          variants: [],
          images: []
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as any).code).toBe('CUSTOM_ERROR')
      }
    })
  })
})