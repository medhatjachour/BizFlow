/**
 * Supplier Repository
 *
 * Handles all data access operations for Supplier entity
 * Abstracts Prisma implementation details
 */

// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
import type { IRepository, FindOptions, PaginatedResult } from '../../shared/interfaces/IRepository'
import { EntityNotFoundError, DuplicateEntityError } from '../../shared/interfaces/IRepository'
import type { SupplierWithRelations, SupplierProductWithRelations, CreateSupplierData } from '../../shared/mappers/SupplierMapper'

/**
 * Supplier repository implementation
 */
export class SupplierRepository implements IRepository<SupplierWithRelations> {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find supplier by ID
   */
  async findById(id: string): Promise<SupplierWithRelations | null> {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      }
    }) as Promise<SupplierWithRelations | null>
  }

  /**
   * Find supplier by name
   */
  async findByName(name: string): Promise<SupplierWithRelations | null> {
    return this.prisma.supplier.findFirst({
      where: { name },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      }
    }) as Promise<SupplierWithRelations | null>
  }

  /**
   * Find all suppliers
   */
  async findAll(options: FindOptions = {}): Promise<SupplierWithRelations[]> {
    const { where, include, orderBy, skip, take, select } = options

    return this.prisma.supplier.findMany({
      where,
      include: include ?? {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      },
      orderBy,
      skip,
      take,
      select
    } as any) as Promise<SupplierWithRelations[]>
  }

  /**
   * Search suppliers
   */
  async search(query: string): Promise<SupplierWithRelations[]> {
    return this.findAll({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { contactName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } }
        ]
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get paginated suppliers
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 20,
    options: FindOptions = {}
  ): Promise<PaginatedResult<SupplierWithRelations>> {
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
   * Create new supplier
   */
  async create(data: CreateSupplierData): Promise<SupplierWithRelations> {
    // Check for duplicate name
    const existing = await this.findByName(data.name)
    if (existing) {
      throw new DuplicateEntityError('Supplier', 'name', data.name)
    }

    return this.prisma.supplier.create({
      data,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      }
    }) as Promise<SupplierWithRelations>
  }

  /**
   * Update supplier
   */
  async update(id: string, data: Partial<CreateSupplierData & { isActive: boolean }>): Promise<SupplierWithRelations> {
    // Check if supplier exists
    const existing = await this.findById(id)
    if (!existing) {
      throw new EntityNotFoundError('Supplier', id)
    }

    // Check for name conflict if updating name
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.findByName(data.name)
      if (duplicate) {
        throw new DuplicateEntityError('Supplier', 'name', data.name)
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      }
    }) as Promise<SupplierWithRelations>
  }

  /**
   * Delete supplier
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if supplier has purchase orders
      const poCount = await this.prisma.purchaseOrder.count({
        where: { supplierId: id }
      })

      if (poCount > 0) {
        throw new Error(`Cannot delete supplier with ${poCount} purchase orders. Deactivate it instead.`)
      }

      await this.prisma.supplier.delete({ where: { id } })
      return true
    } catch (error) {
      if ((error as any).code === 'P2025') {
        throw new EntityNotFoundError('Supplier', id)
      }
      throw error
    }
  }

  /**
   * Count suppliers
   */
  async count(options: FindOptions = {}): Promise<number> {
    return this.prisma.supplier.count({
      where: options.where
    })
  }

  /**
   * Check if supplier exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.supplier.count({
      where: { id }
    })
    return count > 0
  }

  /**
   * Find supplier products
   */
  async findSupplierProducts(supplierId: string): Promise<SupplierProductWithRelations[]> {
    return this.prisma.supplierProduct.findMany({
      where: { supplierId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            baseSKU: true
          }
        }
      },
      orderBy: { product: { name: 'asc' } }
    }) as Promise<SupplierProductWithRelations[]>
  }

  /**
   * Add product to supplier
   */
  async addSupplierProduct(data: {
    supplierId: string
    productId: string
    sku?: string
    cost: number
    leadTime?: number
    minOrderQty?: number
    isPreferred?: boolean
  }): Promise<SupplierProductWithRelations> {
    // Check if supplier exists
    const supplier = await this.findById(data.supplierId)
    if (!supplier) {
      throw new EntityNotFoundError('Supplier', data.supplierId)
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId }
    })
    if (!product) {
      throw new EntityNotFoundError('Product', data.productId)
    }

    // Check for existing link
    const existing = await this.prisma.supplierProduct.findUnique({
      where: {
        supplierId_productId: {
          supplierId: data.supplierId,
          productId: data.productId
        }
      }
    })
    if (existing) {
      throw new DuplicateEntityError('SupplierProduct', 'supplierId_productId', `${data.supplierId}_${data.productId}`)
    }

    return this.prisma.supplierProduct.create({
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            baseSKU: true
          }
        }
      }
    }) as Promise<SupplierProductWithRelations>
  }

  /**
   * Update supplier product
   */
  async updateSupplierProduct(id: string, data: Partial<{
    sku: string
    cost: number
    leadTime: number
    minOrderQty: number
    isPreferred: boolean
  }>): Promise<SupplierProductWithRelations> {
    return this.prisma.supplierProduct.update({
      where: { id },
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            baseSKU: true
          }
        }
      }
    }) as Promise<SupplierProductWithRelations>
  }

  /**
   * Remove product from supplier
   */
  async removeSupplierProduct(id: string): Promise<boolean> {
    try {
      await this.prisma.supplierProduct.delete({ where: { id } })
      return true
    } catch (error) {
      if ((error as any).code === 'P2025') {
        throw new EntityNotFoundError('SupplierProduct', id)
      }
      throw error
    }
  }

  /**
   * Get preferred suppliers for a product
   */
  async getPreferredSuppliersForProduct(productId: string): Promise<SupplierWithRelations[]> {
    return this.prisma.supplier.findMany({
      where: {
        products: {
          some: {
            productId,
            isPreferred: true
          }
        }
      },
      include: {
        products: {
          where: { productId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        }
      }
    }) as Promise<SupplierWithRelations[]>
  }
}