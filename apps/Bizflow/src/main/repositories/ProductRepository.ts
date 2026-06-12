/**
 * Product Repository
 * 
 * Handles all data access operations for Product entity
 * Abstracts Prisma implementation details
 */

import type { PrismaClient } from '@prisma/client'
import type { IRepository, FindOptions, PaginatedResult } from '../../shared/interfaces/IRepository'
import { EntityNotFoundError, DuplicateEntityError } from '../../shared/interfaces/IRepository'

/**
 * Product with relations
 */
export type ProductWithRelations = any

type Product = any
type ProductVariant = any
type ProductImage = any

/**
 * Product creation data
 */
export interface CreateProductData {
  name: string
  baseSKU: string
  category: string
  description?: string
  basePrice: number
  baseCost: number
  hasVariants: boolean
  storeId?: string
  variants?: Omit<ProductVariant, 'id' | 'productId' | 'createdAt' | 'updatedAt'>[]
  images?: Omit<ProductImage, 'id' | 'productId' | 'createdAt'>[]
}

/**
 * Product repository implementation
 */
export class ProductRepository implements IRepository<ProductWithRelations> {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: {
          orderBy: { order: 'asc' }
        }
      }
    }) as Promise<ProductWithRelations | null>
  }

  /**
   * Find product by SKU
   */
  async findBySKU(sku: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { baseSKU: sku },
      include: {
        variants: true,
        images: true
      }
    }) as Promise<ProductWithRelations | null>
  }

  /**
   * Find all products
   */
  async findAll(options: FindOptions = {}): Promise<ProductWithRelations[]> {
    const { where, include, orderBy, skip, take, select } = options

    return this.prisma.product.findMany({
      where,
      include: include ?? {
        variants: true,
        images: true
      },
      orderBy,
      skip,
      take,
      select
    }) as Promise<ProductWithRelations[]>
  }

  /**
   * Find products by category
   */
  async findByCategory(category: string): Promise<ProductWithRelations[]> {
    return this.findAll({
      where: { category },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Find products by store
   */
  async findByStore(storeId: string): Promise<ProductWithRelations[]> {
    return this.findAll({
      where: { storeId },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Search products
   */
  async search(query: string): Promise<ProductWithRelations[]> {
    return this.findAll({
      where: {
        OR: [
          { name: { contains: query } },
          { baseSKU: { contains: query } },
          { category: { contains: query } },
          { description: { contains: query } }
        ]
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get paginated products
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 20,
    options: FindOptions = {}
  ): Promise<PaginatedResult<ProductWithRelations>> {
    const skip = (page - 1) * pageSize
    const take = pageSize

    const [data, total] = await Promise.all([
      this.findAll({ ...options, skip, take }),
      this.count(options)
    ])

    const totalPages = Math.ceil(total / pageSize)

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  }

  /**
   * Create new product
   */
  async create(data: CreateProductData): Promise<ProductWithRelations> {
    // Check for duplicate SKU
    const existing = await this.findBySKU(data.baseSKU)
    if (existing) {
      throw new DuplicateEntityError('Product', 'baseSKU', data.baseSKU)
    }

    const { variants, images, ...productData } = data

    return this.prisma.product.create({
      data: {
        ...productData,
        variants: variants ? {
          create: variants
        } : undefined,
        images: images ? {
          create: images
        } : undefined
      },
      include: {
        variants: true,
        images: true
      }
    }) as Promise<ProductWithRelations>
  }

  /**
   * Update product
   */
  async update(id: string, data: Partial<CreateProductData>): Promise<ProductWithRelations> {
    // Check if product exists
    const existing = await this.findById(id)
    if (!existing) {
      throw new EntityNotFoundError('Product', id)
    }

    // Check for SKU conflict if updating SKU
    if (data.baseSKU && data.baseSKU !== (existing as Product).baseSKU) {
      const duplicate = await this.findBySKU(data.baseSKU)
      if (duplicate) {
        throw new DuplicateEntityError('Product', 'baseSKU', data.baseSKU)
      }
    }

    const { variants, images, ...productData } = data

    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: {
        variants: true,
        images: true
      }
    }) as Promise<ProductWithRelations>
  }

  /**
   * Delete product
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if product has sales
      const salesCount = await this.prisma.saleItem.count({
        where: { productId: id }
      })

      if (salesCount > 0) {
        throw new Error(`Cannot delete product with ${salesCount} sales. Archive it instead.`)
      }

      await this.prisma.product.delete({ where: { id } })
      return true
    } catch (error) {
      if ((error as any).code === 'P2025') {
        throw new EntityNotFoundError('Product', id)
      }
      throw error
    }
  }

  /**
   * Count products
   */
  async count(options: FindOptions = {}): Promise<number> {
    return this.prisma.product.count({
      where: options.where
    })
  }

  /**
   * Check if product exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id }
    })
    return count > 0
  }

  /**
   * Get products with low stock
   */
  async findLowStock(threshold: number = 10): Promise<ProductWithRelations[]> {
    const products = await this.findAll()
    
    return products.filter(product => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
      return totalStock <= threshold && totalStock > 0
    })
  }

  /**
   * Get out of stock products
   */
  async findOutOfStock(): Promise<ProductWithRelations[]> {
    const products = await this.findAll()
    
    return products.filter(product => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
      return totalStock === 0
    })
  }

  /**
   * Update variant stock
   */
  async updateVariantStock(variantId: string, stock: number): Promise<ProductVariant> {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock }
    })
  }

  /**
   * Add product image
   */
  async addImage(productId: string, imageData: string, order: number = 0): Promise<ProductImage> {
    return this.prisma.productImage.create({
      data: {
        productId,
        imageData,
        order
      }
    })
  }

  /**
   * Delete product image
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      await this.prisma.productImage.delete({ where: { id: imageId } })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      select: { category: true },
      distinct: ['category']
    })
    
    return products.map(p => p.category).sort()
  }
}
