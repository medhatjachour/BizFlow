/**
 * Supplier Mapper
 *
 * Transforms between domain models and DTOs
 * Ensures clean separation of concerns
 */

import type {
  SupplierResponseDTO,
  SupplierProductResponseDTO,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  CreateSupplierProductDTO,
  UpdateSupplierProductDTO
} from '../dtos/supplier.dto'

// Define types for Supplier with relations
export interface SupplierWithRelations {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  isActive: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  products: SupplierProductWithRelations[]
  purchaseOrders: Array<{
    id: string
    totalAmount: number
    status: string
  }>
}

export interface SupplierProductWithRelations {
  id: string
  supplierId: string
  productId: string
  sku: string | null
  cost: number
  leadTime: number | null
  minOrderQty: number
  isPreferred: boolean
  createdAt: Date
  updatedAt: Date
  product: {
    id: string
    name: string
    baseSKU: string
  }
}

export interface CreateSupplierData {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  notes?: string
}

/**
 * Supplier mapper utilities
 */
export class SupplierMapper {
  /**
   * Map Supplier entity to Response DTO
   */
  static toResponseDTO(supplier: SupplierWithRelations): SupplierResponseDTO {
    const productCount = supplier.products.length
    const totalPurchaseOrders = supplier.purchaseOrders.length
    const totalPurchased = supplier.purchaseOrders
      .filter(po => po.status === 'received')
      .reduce((sum, po) => sum + po.totalAmount, 0)

    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      isActive: supplier.isActive,
      notes: supplier.notes,
      productCount,
      totalPurchaseOrders,
      totalPurchased,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString()
    }
  }

  /**
   * Map array of Suppliers to Response DTOs
   */
  static toResponseDTOs(suppliers: SupplierWithRelations[]): SupplierResponseDTO[] {
    return suppliers.map(s => this.toResponseDTO(s))
  }

  /**
   * Map SupplierProduct to Response DTO
   */
  static toSupplierProductDTO(supplierProduct: SupplierProductWithRelations): SupplierProductResponseDTO {
    return {
      id: supplierProduct.id,
      supplierId: supplierProduct.supplierId,
      productId: supplierProduct.productId,
      productName: supplierProduct.product.name,
      productSKU: supplierProduct.product.baseSKU,
      sku: supplierProduct.sku,
      cost: supplierProduct.cost,
      leadTime: supplierProduct.leadTime,
      minOrderQty: supplierProduct.minOrderQty,
      isPreferred: supplierProduct.isPreferred,
      createdAt: supplierProduct.createdAt.toISOString(),
      updatedAt: supplierProduct.updatedAt.toISOString()
    }
  }

  /**
   * Map array of SupplierProducts to Response DTOs
   */
  static toSupplierProductDTOs(supplierProducts: SupplierProductWithRelations[]): SupplierProductResponseDTO[] {
    return supplierProducts.map(sp => this.toSupplierProductDTO(sp))
  }

  /**
   * Map Create DTO to Repository Data
   */
  static toCreateData(dto: CreateSupplierDTO): CreateSupplierData {
    return {
      name: dto.name.trim(),
      contactName: dto.contactName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      address: dto.address?.trim(),
      paymentTerms: dto.paymentTerms?.trim(),
      notes: dto.notes?.trim()
    }
  }

  /**
   * Map Update DTO to Repository Data
   */
  static toUpdateData(dto: UpdateSupplierDTO): Partial<CreateSupplierData & { isActive: boolean }> {
    const data: Partial<CreateSupplierData & { isActive: boolean }> = {}

    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.contactName !== undefined) data.contactName = dto.contactName?.trim()
    if (dto.email !== undefined) data.email = dto.email?.trim().toLowerCase()
    if (dto.phone !== undefined) data.phone = dto.phone?.trim()
    if (dto.address !== undefined) data.address = dto.address?.trim()
    if (dto.paymentTerms !== undefined) data.paymentTerms = dto.paymentTerms?.trim()
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.notes !== undefined) data.notes = dto.notes?.trim()

    return data
  }

  /**
   * Map Create Supplier Product DTO to Repository Data
   */
  static toCreateSupplierProductData(dto: CreateSupplierProductDTO) {
    return {
      supplierId: dto.supplierId,
      productId: dto.productId,
      sku: dto.sku?.trim(),
      cost: Number(dto.cost),
      leadTime: dto.leadTime,
      minOrderQty: dto.minOrderQty ?? 1,
      isPreferred: dto.isPreferred ?? false
    }
  }

  /**
   * Map Update Supplier Product DTO to Repository Data
   */
  static toUpdateSupplierProductData(dto: UpdateSupplierProductDTO) {
    const data: any = {}

    if (dto.sku !== undefined) data.sku = dto.sku?.trim()
    if (dto.cost !== undefined) data.cost = Number(dto.cost)
    if (dto.leadTime !== undefined) data.leadTime = dto.leadTime
    if (dto.minOrderQty !== undefined) data.minOrderQty = dto.minOrderQty
    if (dto.isPreferred !== undefined) data.isPreferred = dto.isPreferred

    return data
  }
}