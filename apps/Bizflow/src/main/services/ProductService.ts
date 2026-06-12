/**
 * Product Service
 * 
 * Business logic layer for product management
 * Orchestrates repositories, applies business rules, emits events
 */

import type { PrismaClient } from '@prisma/client'
import { ProductRepository } from '../repositories/ProductRepository'
import { ProductMapper } from '../../shared/mappers/ProductMapper'
import type {
  CreateProductDTO,
  UpdateProductDTO,
  ProductResponseDTO,
  ProductQueryDTO,
  PaginatedProductsDTO,
  UpdateStockDTO,
  BulkUpdateStockDTO
} from '../../shared/dtos/product.dto'
import { EntityNotFoundError, DuplicateEntityError } from '../../shared/interfaces/IRepository'
import { createLogger } from '../utils/logger'
const log = createLogger('Products')
import { eventBus } from '../../shared/events/EventBus'

/**
 * Product Service Error
 */
export class ProductServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'ProductServiceError'
  }
}

/**
 * Product Business Logic Service
 */
export class ProductService {
  private productRepository: ProductRepository

  constructor(prisma: PrismaClient) {
    this.productRepository = new ProductRepository(prisma)
  }

  /**
   * Create new product
   */
  async createProduct(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    try {
      log.info('Creating product', { sku: dto.baseSKU })

      // Validate business rules
      this.validateProductData(dto)

      // Check SKU uniqueness
      const existing = await this.productRepository.findBySKU(dto.baseSKU)
      if (existing) {
        throw new DuplicateEntityError('Product', 'SKU', dto.baseSKU)
      }

      // Validate variants if present
      if (dto.variants && dto.variants.length > 0) {
        this.validateVariants(dto.variants)
      }

      // Map DTO to create data
      const createData = ProductMapper.toCreateData(dto)

      // Create product
      const product = await this.productRepository.create(createData)

      log.info('Product created', { id: product.id, sku: product.baseSKU })

      // Emit event
      await eventBus.emit('product:created', {
        productId: product.id,
        sku: product.baseSKU
      })

      // Map to response DTO
      return ProductMapper.toResponseDTO(product)
    } catch (error) {
      log.error('Failed to create product', { error, dto })
      if (error instanceof EntityNotFoundError || error instanceof DuplicateEntityError || error instanceof ProductServiceError) {
        throw error
      }
      const code = (error as any).code || 'CREATE_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new ProductServiceError(`Failed to create product: ${errorMessage}`, code)
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<ProductResponseDTO> {
    try {
      const product = await this.productRepository.findById(id)
      if (!product) {
        throw new EntityNotFoundError('Product', id)
      }
      return ProductMapper.toResponseDTO(product)
    } catch (error) {
      log.error('Failed to get product', { error, id })
      throw error
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku: string): Promise<ProductResponseDTO> {
    try {
      const product = await this.productRepository.findBySKU(sku)
      if (!product) {
        throw new EntityNotFoundError('Product', sku)
      }
      return ProductMapper.toResponseDTO(product)
    } catch (error) {
      log.error('Failed to get product by SKU', { error, sku })
      throw error
    }
  }

  /**
   * Query products with filters and pagination
   */
  async queryProducts(query: ProductQueryDTO): Promise<PaginatedProductsDTO> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20

      // Build filter options
      const options: any = {}

      if (query.search) {
        const products = await this.productRepository.search(query.search)
        return {
          data: ProductMapper.toResponseDTOs(products),
          total: products.length,
          page: 1,
          pageSize: products.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      }

      if (query.category) {
        options.where = { ...options.where, category: query.category }
      }

      if (query.storeId) {
        options.where = { ...options.where, storeId: query.storeId }
      }

      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        options.where = {
          ...options.where,
          basePrice: {
            ...(query.minPrice !== undefined && { gte: query.minPrice }),
            ...(query.maxPrice !== undefined && { lte: query.maxPrice })
          }
        }
      }

      if (query.sortBy) {
        options.orderBy = { [query.sortBy]: query.sortOrder || 'asc' }
      }

      // Get paginated results
      const result = await this.productRepository.findPaginated(page, pageSize, options)

      return {
        data: ProductMapper.toResponseDTOs(result.data),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      }
    } catch (error) {
      log.error('Failed to query products', { error, query })
      throw error
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, dto: UpdateProductDTO): Promise<ProductResponseDTO> {
    try {
      log.info('Updating product', { id })

      // Validate business rules if applicable
      if (dto.basePrice !== undefined && dto.basePrice < 0) {
        throw new ProductServiceError('Price cannot be negative', 'INVALID_PRICE')
      }

      if (dto.baseCost !== undefined && dto.baseCost < 0) {
        throw new ProductServiceError('Cost cannot be negative', 'INVALID_COST')
      }

      // Check SKU uniqueness if changing
      if (dto.baseSKU) {
        const existing = await this.productRepository.findBySKU(dto.baseSKU)
        if (existing && existing.id !== id) {
          throw new DuplicateEntityError('Product', 'SKU', dto.baseSKU)
        }
      }

      // Map DTO to update data
      const updateData = ProductMapper.toUpdateData(dto)

      // Update product
      const product = await this.productRepository.update(id, updateData)

      log.info('Product updated', { id })

      // Emit event
      await eventBus.emit('product:updated', {
        productId: id,
        changes: updateData
      })

      return ProductMapper.toResponseDTO(product)
    } catch (error) {
      log.error('Failed to update product', { error, id, dto })
      throw error
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<boolean> {
    try {
      log.info('Deleting product', { id })

      const deleted = await this.productRepository.delete(id)

      if (deleted) {
        log.info('Product deleted', { id })
        
        // Emit event
        await eventBus.emit('product:deleted', {
          productId: id,
          sku: 'UNKNOWN' // We don't have SKU after deletion
        })
      }

      return deleted
    } catch (error) {
      log.error('Failed to delete product', { error, id })
      throw error
    }
  }

  /**
   * Update variant stock
   */
  async updateStock(dto: UpdateStockDTO): Promise<void> {
    try {
      log.info('Updating stock', { variantId: dto.variantId, stock: dto.stock })

      if (dto.stock < 0) {
        throw new ProductServiceError('Stock cannot be negative', 'INVALID_STOCK')
      }

      await this.productRepository.updateVariantStock(dto.variantId, dto.stock)

      log.info('Stock updated', { variantId: dto.variantId, stock: dto.stock })

      // Emit event
      await eventBus.emit('stock:updated', {
        variantId: dto.variantId,
        oldStock: 0, // We don't track old value here
        newStock: dto.stock
      })
    } catch (error) {
      log.error('Failed to update stock', { error, dto })
      throw error
    }
  }

  /**
   * Bulk update stock
   */
  async bulkUpdateStock(dto: BulkUpdateStockDTO): Promise<void> {
    try {
      log.info('Bulk updating stock', { count: dto.updates.length })

      for (const update of dto.updates) {
        if (update.stock < 0) {
          throw new ProductServiceError('Stock cannot be negative', 'INVALID_STOCK')
        }
        await this.productRepository.updateVariantStock(update.variantId, update.stock)
      }

      log.info('Bulk stock update complete')
    } catch (error) {
      log.error('Failed to bulk update stock', { error, dto })
      throw error
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold: number = 10): Promise<ProductResponseDTO[]> {
    try {
      const products = await this.productRepository.findLowStock(threshold)
      return ProductMapper.toResponseDTOs(products)
    } catch (error) {
      log.error('Failed to get low stock products', { error, threshold })
      throw error
    }
  }

  /**
   * Get out of stock products
   */
  async getOutOfStockProducts(): Promise<ProductResponseDTO[]> {
    try {
      const products = await this.productRepository.findOutOfStock()
      return ProductMapper.toResponseDTOs(products)
    } catch (error) {
      log.error('Failed to get out of stock products', { error })
      throw error
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    try {
      return await this.productRepository.getCategories()
    } catch (error) {
      log.error('Failed to get categories', { error })
      throw error
    }
  }

  /**
   * Add product image
   */
  async addImage(productId: string, imageData: string, order: number): Promise<void> {
    try {
      log.info('Adding product image', { productId, order })
      await this.productRepository.addImage(productId, imageData, order)
      log.info('Product image added', { productId })
    } catch (error) {
      log.error('Failed to add product image', { error, productId })
      throw error
    }
  }

  /**
   * Delete product image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      log.info('Deleting product image', { imageId })
      await this.productRepository.deleteImage(imageId)
      log.info('Product image deleted', { imageId })
    } catch (error) {
      log.error('Failed to delete product image', { error, imageId })
      throw error
    }
  }

  /**
   * Validate product data
   */
  private validateProductData(dto: CreateProductDTO): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ProductServiceError('Product name is required', 'INVALID_NAME')
    }

    if (!dto.baseSKU || dto.baseSKU.trim().length === 0) {
      throw new ProductServiceError('Product SKU is required', 'INVALID_SKU')
    }

    if (!dto.category || dto.category.trim().length === 0) {
      throw new ProductServiceError('Product category is required', 'INVALID_CATEGORY')
    }

    if (dto.basePrice < 0) {
      throw new ProductServiceError('Price cannot be negative', 'INVALID_PRICE')
    }

    if (dto.baseCost < 0) {
      throw new ProductServiceError('Cost cannot be negative', 'INVALID_COST')
    }
  }

  /**
   * Validate variants
   */
  private validateVariants(variants: Array<{ sku: string; price: number; stock: number }>): void {
    const skus = new Set<string>()

    for (const variant of variants) {
      // Check for duplicate SKUs
      if (skus.has(variant.sku)) {
        throw new ProductServiceError(`Duplicate variant SKU: ${variant.sku}`, 'DUPLICATE_VARIANT_SKU')
      }
      skus.add(variant.sku)

      // Validate variant data
      if (!variant.sku || variant.sku.trim().length === 0) {
        throw new ProductServiceError('Variant SKU is required', 'INVALID_VARIANT_SKU')
      }

      if (variant.price < 0) {
        throw new ProductServiceError('Variant price cannot be negative', 'INVALID_VARIANT_PRICE')
      }

      if (variant.stock < 0) {
        throw new ProductServiceError('Variant stock cannot be negative', 'INVALID_VARIANT_STOCK')
      }
    }
  }
}
