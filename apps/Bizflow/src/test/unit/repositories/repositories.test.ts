/**
 * Repository Unit Tests
 * Tests for data access layer repositories
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProductRepository } from '../../../main/repositories/ProductRepository'
import { PurchaseOrderRepository } from '../../../main/repositories/PurchaseOrderRepository'
import { SupplierRepository } from '../../../main/repositories/SupplierRepository'
import { EntityNotFoundError, DuplicateEntityError } from '../../../shared/interfaces/IRepository'

// Mock Prisma
const mockPrisma = {
  product: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  },
  productVariant: {
    update: vi.fn()
  },
  productImage: {
    create: vi.fn(),
    delete: vi.fn()
  },
  sale: {
    count: vi.fn()
  },
  saleItem: {
    count: vi.fn()
  },
  purchaseOrder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  },
  supplier: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn()
  }
}

describe('Repository Tests', () => {
  let productRepo: ProductRepository
  let purchaseOrderRepo: PurchaseOrderRepository
  let supplierRepo: SupplierRepository

  beforeEach(() => {
    vi.clearAllMocks()
    productRepo = new ProductRepository(mockPrisma as any)
    purchaseOrderRepo = new PurchaseOrderRepository(mockPrisma as any)
    supplierRepo = new SupplierRepository(mockPrisma as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ProductRepository', () => {
    const mockProduct = {
      id: 'prod-1',
      name: 'Test Product',
      baseSKU: 'TEST-001',
      category: 'Electronics',
      basePrice: 100,
      baseCost: 80,
      hasVariants: true,
      variants: [
        { id: 'var-1', sku: 'TEST-001-S', color: 'Red', size: 'S', stock: 10, price: 100 },
        { id: 'var-2', sku: 'TEST-001-M', color: 'Red', size: 'M', stock: 15, price: 100 }
      ],
      images: [
        { id: 'img-1', filename: 'test.jpg', order: 0 }
      ]
    }

    describe('findById', () => {
      it('should find product by ID with relations', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(mockProduct)

        const result = await productRepo.findById('prod-1')

        expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          include: {
            variants: true,
            images: { orderBy: { order: 'asc' } }
          }
        })
        expect(result).toEqual(mockProduct)
      })

      it('should return null when product not found', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(null)

        const result = await productRepo.findById('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('findBySKU', () => {
      it('should find product by SKU', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(mockProduct)

        const result = await productRepo.findBySKU('TEST-001')

        expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
          where: { baseSKU: 'TEST-001' },
          include: {
            variants: true,
            images: true
          }
        })
        expect(result).toEqual(mockProduct)
      })
    })

    describe('findAll', () => {
      it('should find all products with default includes', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const result = await productRepo.findAll()

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          where: undefined,
          include: { variants: true, images: true },
          orderBy: undefined,
          skip: undefined,
          take: undefined,
          select: undefined
        })
        expect(result).toEqual(mockProducts)
      })

      it('should find products with custom options', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const options = {
          where: { category: 'Electronics' },
          orderBy: { name: 'asc' },
          skip: 10,
          take: 20
        }

        const result = await productRepo.findAll(options)

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          ...options,
          include: { variants: true, images: true }
        })
        expect(result).toEqual(mockProducts)
      })
    })

    describe('findByCategory', () => {
      it('should find products by category', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const result = await productRepo.findByCategory('Electronics')

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          where: { category: 'Electronics' },
          include: { variants: true, images: true },
          orderBy: { name: 'asc' },
          skip: undefined,
          take: undefined,
          select: undefined
        })
        expect(result).toEqual(mockProducts)
      })
    })

    describe('findByStore', () => {
      it('should find products by store', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const result = await productRepo.findByStore('store-1')

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          where: { storeId: 'store-1' },
          include: { variants: true, images: true },
          orderBy: { name: 'asc' },
          skip: undefined,
          take: undefined,
          select: undefined
        })
        expect(result).toEqual(mockProducts)
      })
    })

    describe('search', () => {
      it('should search products by query', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const result = await productRepo.search('test')

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          where: {
            OR: [
              { name: { contains: 'test' } },
              { baseSKU: { contains: 'test' } },
              { category: { contains: 'test' } },
              { description: { contains: 'test' } }
            ]
          },
          include: { variants: true, images: true },
          orderBy: { name: 'asc' },
          skip: undefined,
          take: undefined,
          select: undefined
        })
        expect(result).toEqual(mockProducts)
      })
    })

    describe('findPaginated', () => {
      it('should return paginated results', async () => {
        const mockProducts = [mockProduct]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)
        mockPrisma.product.count.mockResolvedValue(25)

        const result = await productRepo.findPaginated(2, 10)

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          skip: 10,
          take: 10,
          where: undefined,
          include: { variants: true, images: true },
          orderBy: undefined,
          select: undefined
        })
        expect(mockPrisma.product.count).toHaveBeenCalledWith({ where: undefined })

        expect(result).toEqual({
          data: mockProducts,
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
          hasNext: true,
          hasPrevious: true
        })
      })
    })

    describe('create', () => {
      it('should create a new product', async () => {
        const createData = {
          name: 'New Product',
          baseSKU: 'NEW-001',
          category: 'Electronics',
          basePrice: 150,
          baseCost: 120,
          hasVariants: false
        }

        mockPrisma.product.findUnique.mockResolvedValue(null) // No duplicate SKU
        mockPrisma.product.create.mockResolvedValue(mockProduct)

        const result = await productRepo.create(createData)

        expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
          where: { baseSKU: 'NEW-001' },
          include: { variants: true, images: true }
        })

        expect(mockPrisma.product.create).toHaveBeenCalledWith({
          data: createData,
          include: { variants: true, images: true }
        })

        expect(result).toEqual(mockProduct)
      })

      it('should throw error for duplicate SKU', async () => {
        const createData = {
          name: 'New Product',
          baseSKU: 'TEST-001',
          category: 'Electronics',
          basePrice: 150,
          baseCost: 120,
          hasVariants: false
        }

        mockPrisma.product.findUnique.mockResolvedValue(mockProduct) // Duplicate found

        await expect(productRepo.create(createData)).rejects.toThrow(DuplicateEntityError)
      })

      it('should create product with variants and images', async () => {
        const createData = {
          name: 'New Product',
          baseSKU: 'NEW-001',
          category: 'Electronics',
          basePrice: 150,
          baseCost: 120,
          hasVariants: true,
          variants: [{ sku: 'NEW-001-S', color: 'Blue', size: 'S', stock: 10, price: 150 }],
          images: [{ imageData: 'base64data', order: 0 }]
        }

        mockPrisma.product.findUnique.mockResolvedValue(null)
        mockPrisma.product.create.mockResolvedValue(mockProduct)

        await productRepo.create(createData)

        expect(mockPrisma.product.create).toHaveBeenCalledWith({
          data: {
            name: 'New Product',
            baseSKU: 'NEW-001',
            category: 'Electronics',
            basePrice: 150,
            baseCost: 120,
            hasVariants: true,
            variants: { create: createData.variants },
            images: { create: createData.images }
          },
          include: { variants: true, images: true }
        })
      })
    })

    describe('update', () => {
      it('should update existing product', async () => {
        const updateData = { name: 'Updated Product', basePrice: 200 }
        const updatedProduct = { ...mockProduct, ...updateData }

        mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
        mockPrisma.product.update.mockResolvedValue(updatedProduct)

        const result = await productRepo.update('prod-1', updateData)

        expect(mockPrisma.product.update).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          data: updateData,
          include: { variants: true, images: true }
        })
        expect(result).toEqual(updatedProduct)
      })

      it('should throw error when product not found', async () => {
        mockPrisma.product.findUnique.mockResolvedValue(null)

        await expect(productRepo.update('nonexistent', { name: 'Test' })).rejects.toThrow(EntityNotFoundError)
      })

      it('should throw error for SKU conflict', async () => {
        const updateData = { baseSKU: 'CONFLICT-001' }
        const conflictingProduct = { ...mockProduct, id: 'prod-2', baseSKU: 'CONFLICT-001' }

        mockPrisma.product.findUnique
          .mockResolvedValueOnce(mockProduct) // findById
          .mockResolvedValueOnce(conflictingProduct) // findBySKU check

        await expect(productRepo.update('prod-1', updateData)).rejects.toThrow(DuplicateEntityError)
      })
    })

    describe('delete', () => {
      it('should delete product successfully', async () => {
        mockPrisma.saleItem.count.mockResolvedValue(0) // No sales
        mockPrisma.product.delete.mockResolvedValue(mockProduct)

        const result = await productRepo.delete('prod-1')

        expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } })
        expect(result).toBe(true)
      })

      it('should throw error when product has sales', async () => {
        mockPrisma.saleItem.count.mockResolvedValue(5) // Has sales

        await expect(productRepo.delete('prod-1')).rejects.toThrow('Cannot delete product with 5 sales')
      })

      it('should throw error when product not found', async () => {
        mockPrisma.saleItem.count.mockResolvedValue(0)
        const error = new Error('Product not found')
        ;(error as any).code = 'P2025'
        mockPrisma.product.delete.mockRejectedValue(error)

        await expect(productRepo.delete('nonexistent')).rejects.toThrow(EntityNotFoundError)
      })
    })

    describe('count', () => {
      it('should count products', async () => {
        mockPrisma.product.count.mockResolvedValue(42)

        const result = await productRepo.count({ where: { category: 'Electronics' } })

        expect(mockPrisma.product.count).toHaveBeenCalledWith({
          where: { category: 'Electronics' }
        })
        expect(result).toBe(42)
      })
    })

    describe('exists', () => {
      it('should return true when product exists', async () => {
        mockPrisma.product.count.mockResolvedValue(1)

        const result = await productRepo.exists('prod-1')

        expect(result).toBe(true)
      })

      it('should return false when product does not exist', async () => {
        mockPrisma.product.count.mockResolvedValue(0)

        const result = await productRepo.exists('nonexistent')

        expect(result).toBe(false)
      })
    })

    describe('findLowStock', () => {
      it('should find products with low stock', async () => {
        const lowStockProduct = {
          ...mockProduct,
          variants: [
            { id: 'var-1', stock: 5 }, // Low stock
            { id: 'var-2', stock: 3 }  // Low stock
          ]
        }
        const normalStockProduct = {
          ...mockProduct,
          id: 'prod-2',
          variants: [
            { id: 'var-3', stock: 20 } // Normal stock
          ]
        }

        mockPrisma.product.findMany.mockResolvedValue([lowStockProduct, normalStockProduct])

        const result = await productRepo.findLowStock(10)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(lowStockProduct)
      })
    })

    describe('findOutOfStock', () => {
      it('should find out of stock products', async () => {
        const outOfStockProduct = {
          ...mockProduct,
          variants: [
            { id: 'var-1', stock: 0 }, // Out of stock
            { id: 'var-2', stock: 0 }  // Out of stock
          ]
        }
        const inStockProduct = {
          ...mockProduct,
          id: 'prod-2',
          variants: [
            { id: 'var-3', stock: 5 } // In stock
          ]
        }

        mockPrisma.product.findMany.mockResolvedValue([outOfStockProduct, inStockProduct])

        const result = await productRepo.findOutOfStock()

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(outOfStockProduct)
      })
    })

    describe('updateVariantStock', () => {
      it('should update variant stock', async () => {
        const updatedVariant = { id: 'var-1', stock: 25 }
        mockPrisma.productVariant.update.mockResolvedValue(updatedVariant)

        const result = await productRepo.updateVariantStock('var-1', 25)

        expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
          where: { id: 'var-1' },
          data: { stock: 25 }
        })
        expect(result).toEqual(updatedVariant)
      })
    })

    describe('addImage', () => {
      it('should add product image', async () => {
        const newImage = { id: 'img-2', productId: 'prod-1', imageData: 'base64data', order: 1 }
        mockPrisma.productImage.create.mockResolvedValue(newImage)

        const result = await productRepo.addImage('prod-1', 'base64data', 1)

        expect(mockPrisma.productImage.create).toHaveBeenCalledWith({
          data: {
            productId: 'prod-1',
            imageData: 'base64data',
            order: 1
          }
        })
        expect(result).toEqual(newImage)
      })
    })

    describe('deleteImage', () => {
      it('should delete product image successfully', async () => {
        mockPrisma.productImage.delete.mockResolvedValue({ id: 'img-1' })

        const result = await productRepo.deleteImage('img-1')

        expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
        expect(result).toBe(true)
      })

      it('should return false when image deletion fails', async () => {
        mockPrisma.productImage.delete.mockRejectedValue(new Error('Not found'))

        const result = await productRepo.deleteImage('nonexistent')

        expect(result).toBe(false)
      })
    })

    describe('getCategories', () => {
      it('should get unique product categories', async () => {
        const mockProducts = [
          { category: 'Electronics' },
          { category: 'Clothing' },
          { category: 'Books' }
        ]
        mockPrisma.product.findMany.mockResolvedValue(mockProducts)

        const result = await productRepo.getCategories()

        expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
          select: { category: true },
          distinct: ['category']
        })
        expect(result).toEqual(['Books', 'Clothing', 'Electronics'])
      })
    })
  })

  describe('PurchaseOrderRepository', () => {
    const mockPurchaseOrder = {
      id: 'po-1',
      supplierId: 'sup-1',
      orderDate: new Date('2025-01-01'),
      status: 'pending',
      totalAmount: 1000,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      supplier: {
        id: 'sup-1',
        name: 'Test Supplier',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
      },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 50,
          totalPrice: 500,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          product: { 
            id: 'prod-1', 
            name: 'Test Product', 
            baseSKU: 'TEST-001',
            description: null,
            basePrice: 100,
            baseCost: 80,
            hasVariants: false,
            categoryId: null,
            storeId: 'store-1',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01')
          }
        }
      ]
    }

    const expectedPurchaseOrderResponse = {
      id: 'po-1',
      supplierId: 'sup-1',
      orderDate: new Date('2025-01-01'),
      status: 'pending' as const,
      totalAmount: 1000,
      supplier: {
        id: 'sup-1',
        name: 'Test Supplier',
        productCount: 0,
        totalPurchaseOrders: 0,
        totalPurchased: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      },
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 50,
          totalPrice: 500,
          variantId: undefined,
          product: { 
            id: 'prod-1', 
            name: 'Test Product', 
            baseSKU: 'TEST-001',
            description: undefined,
            category: null,
            totalStock: 0,
            stockValue: 0,
            retailValue: 0,
            suppliers: [],
            basePrice: 100,
            baseCost: 80,
            hasVariants: false,
            categoryId: null,
            storeId: 'store-1',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01')
          },
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01')
        }
      ],
      expectedDate: undefined,
      receivedDate: undefined,
      notes: undefined,
      approvedBy: undefined,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    }

    describe('findAll', () => {
      it('should find all purchase orders with filters', async () => {
        mockPrisma.purchaseOrder.findMany.mockResolvedValue([mockPurchaseOrder])

        const filters = { supplierId: 'sup-1', status: 'pending' as const }
        const result = await purchaseOrderRepo.findAll(filters)

        expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalledWith({
          where: {
            supplierId: 'sup-1',
            status: 'pending'
          },
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    baseSKU: true,
                    description: true,
                    basePrice: true,
                    baseCost: true,
                    hasVariants: true,
                    categoryId: true,
                    storeId: true,
                    createdAt: true,
                    updatedAt: true
                  }
                }
              }
            }
          },
          orderBy: { orderDate: 'desc' }
        })
        expect(result).toEqual([expectedPurchaseOrderResponse])
      })
    })

    describe('findById', () => {
      it('should find purchase order by ID', async () => {
        mockPrisma.purchaseOrder.findUnique.mockResolvedValue(mockPurchaseOrder)

        const result = await purchaseOrderRepo.findById('po-1')

        expect(mockPrisma.purchaseOrder.findUnique).toHaveBeenCalledWith({
          where: { id: 'po-1' },
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    baseSKU: true,
                    description: true,
                    basePrice: true,
                    baseCost: true,
                    hasVariants: true,
                    categoryId: true,
                    storeId: true,
                    createdAt: true,
                    updatedAt: true
                  }
                }
              }
            }
          }
        })
        expect(result).toEqual(expectedPurchaseOrderResponse)
      })
    })

    describe('create', () => {
      it('should create a new purchase order', async () => {
        const createData = {
          supplierId: 'sup-1',
          items: [{ productId: 'prod-1', quantity: 10, unitCost: 50 }]
        }

        mockPrisma.purchaseOrder.create.mockResolvedValue(mockPurchaseOrder)

        const result = await purchaseOrderRepo.create(createData, 'user-1')

        expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            supplierId: 'sup-1',
            items: { 
              create: [{
                productId: 'prod-1',
                quantity: 10,
                unitCost: 50,
                totalCost: 500
              }]
            },
            totalAmount: 500,
            taxAmount: 0,
            shippingCost: 0,
            orderedBy: 'user-1'
          }),
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    baseSKU: true,
                    description: true,
                    basePrice: true,
                    baseCost: true,
                    hasVariants: true,
                    categoryId: true,
                    storeId: true,
                    createdAt: true,
                    updatedAt: true
                  }
                }
              }
            }
          }
        })
        expect(result).toEqual(expectedPurchaseOrderResponse)
      })
    })

    describe('update', () => {
      it('should update purchase order', async () => {
        const updateData = { status: 'completed' as const }
        const updatedOrder = { ...mockPurchaseOrder, status: 'completed' }

        mockPrisma.purchaseOrder.update.mockResolvedValue(updatedOrder)

        const result = await purchaseOrderRepo.update('po-1', updateData)

        expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith({
          where: { id: 'po-1' },
          data: updateData,
          include: {
            supplier: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    baseSKU: true,
                    description: true,
                    basePrice: true,
                    baseCost: true,
                    hasVariants: true,
                    categoryId: true,
                    storeId: true,
                    createdAt: true,
                    updatedAt: true
                  }
                }
              }
            }
          }
        })
        expect(result).toEqual({
          ...expectedPurchaseOrderResponse,
          status: 'completed'
        })
      })
    })

    describe('delete', () => {
      it('should delete purchase order', async () => {
        mockPrisma.purchaseOrder.delete.mockResolvedValue(mockPurchaseOrder)

        await purchaseOrderRepo.delete('po-1')

        expect(mockPrisma.purchaseOrder.delete).toHaveBeenCalledWith({ where: { id: 'po-1' } })
      })
    })
  })

  describe('SupplierRepository', () => {
    const mockSupplier = {
      id: 'sup-1',
      name: 'Test Supplier',
      email: 'test@supplier.com',
      phone: '123-456-7890',
      address: '123 Supplier St',
      products: [
        {
          id: 'sp-1',
          productId: 'prod-1',
          supplierPrice: 80,
          product: { id: 'prod-1', name: 'Test Product', baseSKU: 'TEST-001' }
        }
      ],
      purchaseOrders: [
        { id: 'po-1', totalAmount: 1000, status: 'pending' }
      ]
    }

    describe('findById', () => {
      it('should find supplier by ID with relations', async () => {
        mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier)

        const result = await supplierRepo.findById('sup-1')

        expect(mockPrisma.supplier.findUnique).toHaveBeenCalledWith({
          where: { id: 'sup-1' },
          include: {
            products: {
              include: {
                product: { select: { id: true, name: true, baseSKU: true } }
              }
            },
            purchaseOrders: {
              select: { id: true, totalAmount: true, status: true }
            }
          }
        })
        expect(result).toEqual(mockSupplier)
      })
    })

    describe('findByName', () => {
      it('should find supplier by name', async () => {
        mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier)

        const result = await supplierRepo.findByName('Test Supplier')

        expect(mockPrisma.supplier.findUnique).toHaveBeenCalledWith({
          where: { name: 'Test Supplier' },
          include: expect.any(Object)
        })
        expect(result).toEqual(mockSupplier)
      })
    })

    describe('findAll', () => {
      it('should find all suppliers', async () => {
        mockPrisma.supplier.findMany.mockResolvedValue([mockSupplier])

        const result = await supplierRepo.findAll()

        expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
          include: expect.any(Object)
        })
        expect(result).toEqual([mockSupplier])
      })
    })

    describe('create', () => {
      it('should create a new supplier', async () => {
        const createData = {
          name: 'New Supplier',
          email: 'new@supplier.com',
          phone: '987-654-3210'
        }

        mockPrisma.supplier.findUnique.mockResolvedValue(null) // No duplicate by name
        mockPrisma.supplier.create.mockResolvedValue(mockSupplier)

        const result = await supplierRepo.create(createData)

        expect(mockPrisma.supplier.findUnique).toHaveBeenCalledWith({
          where: { name: 'New Supplier' },
          include: expect.any(Object)
        })
        expect(result).toEqual(mockSupplier)
      })

      it('should throw error for duplicate name', async () => {
        const createData = { name: 'Test Supplier' }

        mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier) // Duplicate found

        await expect(supplierRepo.create(createData)).rejects.toThrow(DuplicateEntityError)
      })
    })

    describe('update', () => {
      it('should update supplier', async () => {
        const updateData = { email: 'updated@supplier.com' }
        const updatedSupplier = { ...mockSupplier, ...updateData }

        mockPrisma.supplier.findUnique.mockResolvedValue(mockSupplier)
        mockPrisma.supplier.update.mockResolvedValue(updatedSupplier)

        const result = await supplierRepo.update('sup-1', updateData)

        expect(result).toEqual(updatedSupplier)
      })

      it('should throw error when supplier not found', async () => {
        mockPrisma.supplier.findUnique.mockResolvedValue(null)

        await expect(supplierRepo.update('nonexistent', { name: 'Test' })).rejects.toThrow(EntityNotFoundError)
      })
    })

    describe('delete', () => {
      it('should delete supplier', async () => {
        mockPrisma.purchaseOrder.count.mockResolvedValue(0) // No orders
        mockPrisma.supplier.delete.mockResolvedValue(mockSupplier)

        const result = await supplierRepo.delete('sup-1')

        expect(result).toBe(true)
      })

      it('should throw error when supplier has purchase orders', async () => {
        mockPrisma.purchaseOrder.count.mockResolvedValue(3) // Has orders

        await expect(supplierRepo.delete('sup-1')).rejects.toThrow('Cannot delete supplier with 3 purchase orders')
      })
    })
  })
})