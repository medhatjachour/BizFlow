/**
 * Product Repository
 * 
 * Handles all data access operations for Product entity
 * Abstracts Prisma implementation details
 */

// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
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
    } as any) as Promise<ProductWithRelations[]>
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
   *
   * `category` is a relation, so it has to be filtered through the relation
   * field — a scalar `contains` on it is rejected by Prisma.
   */
  async search(query: string): Promise<ProductWithRelations[]> {
    return this.findAll({
      where: {
        OR: [
          { name: { contains: query } },
          { baseSKU: { contains: query } },
          { category: { name: { contains: query } } },
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
      } as any,
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
      data: productData as any,
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
   *
   * The filter is evaluated over the variant table and only the matching
   * products are then loaded. The earlier implementation read the *entire*
   * catalogue - with variants and images - to filter in memory, which is
   * unbounded work (and megabytes of image blobs) for a list that is normally a
   * handful of rows.
   */
  async findLowStock(threshold: number = 10): Promise<ProductWithRelations[]> {
    const ids = await this.productIdsByTotalStock((total) => total > 0 && total <= threshold)

    return this.findAllByIds(ids)
  }

  /**
   * Get out of stock products
   */
  async findOutOfStock(): Promise<ProductWithRelations[]> {
    const ids = await this.productIdsByTotalStock((total) => total === 0)

    return this.findAllByIds(ids)
  }

  /** Product ids whose summed variant stock satisfies `matches`. */
  private async productIdsByTotalStock(
    matches: (totalStock: number) => boolean
  ): Promise<string[]> {
    const grouped = await this.prisma.productVariant.groupBy({
      by: ['productId'],
      _sum: { stock: true }
    })

    return grouped
      .filter((row) => matches(row._sum.stock ?? 0))
      .map((row) => row.productId)
  }

  private findAllByIds(ids: string[]): Promise<ProductWithRelations[]> {
    if (ids.length === 0) return Promise.resolve([])

    return this.findAll({ where: { id: { in: ids } } })
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
        filename: imageData,
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
    const categories = await this.prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    })

    return categories.map(c => c.name)
  }
}
