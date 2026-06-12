/**
 * Supplier Service
 *
 * Business logic layer for supplier management
 * Orchestrates repositories, applies business rules, emits events
 */

import type { PrismaClient } from '@prisma/client'
import { SupplierRepository } from '../repositories/SupplierRepository'
import { SupplierMapper } from '../../shared/mappers/SupplierMapper'
import type {
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierResponseDTO,
  SupplierQueryDTO,
  PaginatedSuppliersDTO,
  CreateSupplierProductDTO,
  UpdateSupplierProductDTO,
  SupplierProductResponseDTO
} from '../../shared/dtos/supplier.dto'
import { EntityNotFoundError, DuplicateEntityError } from '../../shared/interfaces/IRepository'
import { createLogger } from '../utils/logger'
const log = createLogger('Suppliers')
import { eventBus } from '../../shared/events/EventBus'

/**
 * Supplier Service Error
 */
export class SupplierServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'SupplierServiceError'
  }
}

/**
 * Supplier Business Logic Service
 */
export class SupplierService {
  private supplierRepository: SupplierRepository

  constructor(prisma: PrismaClient) {
    this.supplierRepository = new SupplierRepository(prisma)
  }

  /**
   * Create new supplier
   */
  async createSupplier(dto: CreateSupplierDTO): Promise<SupplierResponseDTO> {
    try {
      log.info('Creating supplier', { name: dto.name })

      // Validate business rules
      this.validateSupplierData(dto)

      // Check name uniqueness
      const existing = await this.supplierRepository.findByName(dto.name)
      if (existing) {
        throw new DuplicateEntityError('Supplier', 'name', dto.name)
      }

      // Map DTO to create data
      const createData = SupplierMapper.toCreateData(dto)

      // Create supplier
      const supplier = await this.supplierRepository.create(createData)

      log.info('Supplier created', { id: supplier.id, name: supplier.name })

      // Emit event
      await eventBus.emit('supplier:created', {
        supplierId: supplier.id,
        name: supplier.name
      })

      // Map to response DTO
      return SupplierMapper.toResponseDTO(supplier)
    } catch (error) {
      log.error('Failed to create supplier', { error, dto })
      if (error instanceof EntityNotFoundError || error instanceof DuplicateEntityError || error instanceof SupplierServiceError) {
        throw error
      }
      const code = (error as any).code || 'CREATE_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to create supplier: ${errorMessage}`, code)
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(id: string): Promise<SupplierResponseDTO> {
    try {
      const supplier = await this.supplierRepository.findById(id)
      if (!supplier) {
        throw new EntityNotFoundError('Supplier', id)
      }
      return SupplierMapper.toResponseDTO(supplier)
    } catch (error) {
      log.error('Failed to get supplier', { error, id })
      throw error
    }
  }

  /**
   * Query suppliers with filters and pagination
   */
  async querySuppliers(query: SupplierQueryDTO): Promise<PaginatedSuppliersDTO> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20

      // Build filter options
      const options: any = {}

      if (query.search) {
        const suppliers = await this.supplierRepository.search(query.search)
        return {
          data: SupplierMapper.toResponseDTOs(suppliers),
          total: suppliers.length,
          page: 1,
          pageSize: suppliers.length,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      }

      if (query.isActive !== undefined) {
        options.where = { ...options.where, isActive: query.isActive }
      }

      if (query.sortBy) {
        options.orderBy = { [query.sortBy]: query.sortOrder || 'asc' }
      } else {
        options.orderBy = { name: 'asc' }
      }

      // Get paginated results
      const result = await this.supplierRepository.findPaginated(page, pageSize, options)

      return {
        data: SupplierMapper.toResponseDTOs(result.data),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious
      }
    } catch (error) {
      log.error('Failed to query suppliers', { error, query })
      throw error
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(id: string, dto: UpdateSupplierDTO): Promise<SupplierResponseDTO> {
    try {
      log.info('Updating supplier', { id })

      // Validate business rules if applicable
      if (dto.email && !this.isValidEmail(dto.email)) {
        throw new SupplierServiceError('Invalid email format', 'INVALID_EMAIL')
      }

      // Map DTO to update data
      const updateData = SupplierMapper.toUpdateData(dto)

      // Update supplier
      const supplier = await this.supplierRepository.update(id, updateData)

      log.info('Supplier updated', { id, name: supplier.name })

      // Emit event
      await eventBus.emit('supplier:updated', {
        supplierId: supplier.id,
        name: supplier.name
      })

      // Map to response DTO
      return SupplierMapper.toResponseDTO(supplier)
    } catch (error) {
      log.error('Failed to update supplier', { error, id, dto })
      if (error instanceof EntityNotFoundError || error instanceof DuplicateEntityError || error instanceof SupplierServiceError) {
        throw error
      }
      const code = (error as any).code || 'UPDATE_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to update supplier: ${errorMessage}`, code)
    }
  }

  /**
   * Delete supplier (soft delete by deactivating)
   */
  async deleteSupplier(id: string): Promise<boolean> {
    try {
      log.info('Deleting supplier', { id })

      // Instead of hard delete, we'll deactivate the supplier
      const supplier = await this.supplierRepository.update(id, { isActive: false })

      log.info('Supplier deactivated', { id, name: supplier.name })

      // Emit event
      await eventBus.emit('supplier:deleted', {
        supplierId: supplier.id,
        name: supplier.name
      })

      return true
    } catch (error) {
      log.error('Failed to delete supplier', { error, id })
      if (error instanceof EntityNotFoundError) {
        throw error
      }
      const code = (error as any).code || 'DELETE_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to delete supplier: ${errorMessage}`, code)
    }
  }

  /**
   * Add product to supplier
   */
  async addSupplierProduct(dto: CreateSupplierProductDTO): Promise<SupplierProductResponseDTO> {
    try {
      log.info('Adding product to supplier', { supplierId: dto.supplierId, productId: dto.productId })

      // Validate data
      if (dto.cost < 0) {
        throw new SupplierServiceError('Cost cannot be negative', 'INVALID_COST')
      }

      if (dto.minOrderQty && dto.minOrderQty < 1) {
        throw new SupplierServiceError('Minimum order quantity must be at least 1', 'INVALID_MIN_ORDER_QTY')
      }

      // Map DTO to create data
      const createData = SupplierMapper.toCreateSupplierProductData(dto)

      // Add supplier product
      const supplierProduct = await this.supplierRepository.addSupplierProduct(createData)

      log.info('Product added to supplier', {
        supplierId: supplierProduct.supplierId,
        productId: supplierProduct.productId
      })

      // Emit event
      await eventBus.emit('supplier:product-added', {
        supplierId: supplierProduct.supplierId,
        productId: supplierProduct.productId
      })

      // Map to response DTO
      return SupplierMapper.toSupplierProductDTO(supplierProduct)
    } catch (error) {
      log.error('Failed to add supplier product', { error, dto })
      if (error instanceof EntityNotFoundError || error instanceof DuplicateEntityError || error instanceof SupplierServiceError) {
        throw error
      }
      const code = (error as any).code || 'ADD_PRODUCT_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to add product to supplier: ${errorMessage}`, code)
    }
  }

  /**
   * Update supplier product
   */
  async updateSupplierProduct(id: string, dto: UpdateSupplierProductDTO): Promise<SupplierProductResponseDTO> {
    try {
      log.info('Updating supplier product', { id })

      // Validate data
      if (dto.cost !== undefined && dto.cost < 0) {
        throw new SupplierServiceError('Cost cannot be negative', 'INVALID_COST')
      }

      if (dto.minOrderQty !== undefined && dto.minOrderQty < 1) {
        throw new SupplierServiceError('Minimum order quantity must be at least 1', 'INVALID_MIN_ORDER_QTY')
      }

      // Map DTO to update data
      const updateData = SupplierMapper.toUpdateSupplierProductData(dto)

      // Update supplier product
      const supplierProduct = await this.supplierRepository.updateSupplierProduct(id, updateData)

      log.info('Supplier product updated', { id })

      // Emit event
      await eventBus.emit('supplier:product-updated', {
        supplierId: supplierProduct.supplierId,
        productId: supplierProduct.productId
      })

      // Map to response DTO
      return SupplierMapper.toSupplierProductDTO(supplierProduct)
    } catch (error) {
      log.error('Failed to update supplier product', { error, id, dto })
      if (error instanceof EntityNotFoundError || error instanceof SupplierServiceError) {
        throw error
      }
      const code = (error as any).code || 'UPDATE_PRODUCT_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to update supplier product: ${errorMessage}`, code)
    }
  }

  /**
   * Remove product from supplier
   */
  async removeSupplierProduct(id: string): Promise<boolean> {
    try {
      log.info('Removing product from supplier', { id })

      const result = await this.supplierRepository.removeSupplierProduct(id)

      log.info('Product removed from supplier', { id })

      // Emit event
      await eventBus.emit('supplier:product-removed', { supplierProductId: id })

      return result
    } catch (error) {
      log.error('Failed to remove supplier product', { error, id })
      if (error instanceof EntityNotFoundError) {
        throw error
      }
      const code = (error as any).code || 'REMOVE_PRODUCT_FAILED'
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new SupplierServiceError(`Failed to remove product from supplier: ${errorMessage}`, code)
    }
  }

  /**
   * Get supplier products
   */
  async getSupplierProducts(supplierId: string): Promise<SupplierProductResponseDTO[]> {
    try {
      const supplierProducts = await this.supplierRepository.findSupplierProducts(supplierId)
      return SupplierMapper.toSupplierProductDTOs(supplierProducts)
    } catch (error) {
      log.error('Failed to get supplier products', { error, supplierId })
      throw error
    }
  }

  /**
   * Get preferred suppliers for a product
   */
  async getPreferredSuppliersForProduct(productId: string): Promise<SupplierResponseDTO[]> {
    try {
      const suppliers = await this.supplierRepository.getPreferredSuppliersForProduct(productId)
      return SupplierMapper.toResponseDTOs(suppliers)
    } catch (error) {
      log.error('Failed to get preferred suppliers for product', { error, productId })
      throw error
    }
  }

  /**
   * Validate supplier data
   */
  private validateSupplierData(dto: CreateSupplierDTO): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new SupplierServiceError('Supplier name is required', 'MISSING_NAME')
    }

    if (dto.name.length > 100) {
      throw new SupplierServiceError('Supplier name cannot exceed 100 characters', 'NAME_TOO_LONG')
    }

    if (dto.email && !this.isValidEmail(dto.email)) {
      throw new SupplierServiceError('Invalid email format', 'INVALID_EMAIL')
    }

    if (dto.phone && dto.phone.length > 20) {
      throw new SupplierServiceError('Phone number cannot exceed 20 characters', 'PHONE_TOO_LONG')
    }

    if (dto.paymentTerms && dto.paymentTerms.length > 50) {
      throw new SupplierServiceError('Payment terms cannot exceed 50 characters', 'PAYMENT_TERMS_TOO_LONG')
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}