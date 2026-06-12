/**
 * Product Mapper
 * 
 * Transforms between domain models and DTOs
 * Ensures clean separation of concerns
 */

import type {
  ProductResponseDTO,
  VariantResponseDTO,
  ImageResponseDTO,
  CreateProductDTO,
  UpdateProductDTO
} from '../dtos/product.dto'
import type { ProductWithRelations, CreateProductData } from '../../main/repositories/ProductRepository'

// Extract types from ProductWithRelations
type ProductVariant = ProductWithRelations['variants'][number]
type ProductImage = ProductWithRelations['images'][number]

/**
 * Product mapper utilities
 */
export class ProductMapper {
  /**
   * Map Product entity to Response DTO
   */
  static toResponseDTO(product: ProductWithRelations): ProductResponseDTO {
    // Cast to any to avoid type conflicts between Prisma Product and shared Product types
    const prod = product as any
    
    const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    const stockValue = product.variants.reduce((sum, v) => sum + ((v.stock || 0) * (prod.baseCost || 0)), 0)
    const retailValue = product.variants.reduce((sum, v) => sum + ((v.stock || 0) * (v.price || 0)), 0)
    
    let stockStatus: 'out' | 'low' | 'normal' | 'high'
    if (totalStock === 0) stockStatus = 'out'
    else if (totalStock <= 10) stockStatus = 'low'
    else if (totalStock <= 50) stockStatus = 'normal'
    else stockStatus = 'high'

    return {
      id: prod.id,
      name: prod.name,
      baseSKU: prod.baseSKU,
      category: prod.category,
      description: prod.description,
      basePrice: prod.basePrice,
      baseCost: prod.baseCost,
      hasVariants: prod.hasVariants,
      storeId: prod.storeId,
      totalStock,
      stockValue,
      retailValue,
      variantCount: product.variants.length,
      stockStatus,
      createdAt: prod.createdAt.toISOString(),
      updatedAt: prod.updatedAt.toISOString(),
      variants: product.variants.map(this.toVariantDTO),
      images: product.images.map(this.toImageDTO)
    }
  }

  /**
   * Map array of Products to Response DTOs
   */
  static toResponseDTOs(products: ProductWithRelations[]): ProductResponseDTO[] {
    return products.map(p => this.toResponseDTO(p))
  }

  /**
   * Map ProductVariant to Response DTO
   */
  static toVariantDTO(variant: ProductVariant): VariantResponseDTO {
    return {
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      attributeValues: (variant as any).attributeValues,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString()
    }
  }

  /**
   * Map ProductImage to Response DTO
   */
  static toImageDTO(image: ProductImage): ImageResponseDTO {
    return {
      id: image.id,
      imageData: image.imageData,
      order: image.order,
      createdAt: image.createdAt.toISOString()
    }
  }

  /**
   * Map Create DTO to Repository Data
   */
  static toCreateData(dto: CreateProductDTO): CreateProductData {
    return {
      name: dto.name.trim(),
      baseSKU: dto.baseSKU.trim().toUpperCase(),
      category: dto.category.trim(),
      description: dto.description?.trim(),
      basePrice: Number(dto.basePrice),
      baseCost: Number(dto.baseCost),
      hasVariants: dto.hasVariants,
      storeId: dto.storeId,
      variants: dto.variants?.map(v => ({
        sku: v.sku.trim().toUpperCase(),
        price: Number(v.price),
        stock: Number(v.stock),
        attributes: v.attributes
      })),
      images: dto.images?.map(img => ({
        imageData: img.imageData,
        order: img.order
      }))
    }
  }

  /**
   * Map Update DTO to Repository Data
   */
  static toUpdateData(dto: UpdateProductDTO): Partial<CreateProductData> {
    const data: Partial<CreateProductData> = {}
    
    if (dto.name !== undefined) data.name = dto.name.trim()
    if (dto.baseSKU !== undefined) data.baseSKU = dto.baseSKU.trim().toUpperCase()
    if (dto.category !== undefined) data.category = dto.category.trim()
    if (dto.description !== undefined) data.description = dto.description?.trim()
    if (dto.basePrice !== undefined) data.basePrice = Number(dto.basePrice)
    if (dto.baseCost !== undefined) data.baseCost = Number(dto.baseCost)
    if (dto.hasVariants !== undefined) data.hasVariants = dto.hasVariants
    if (dto.storeId !== undefined) data.storeId = dto.storeId
    
    return data
  }
}
