/**
 * Products IPC Handlers
 * High-performance product management with optimized queries for large datasets
 * 
 * Performance Optimizations:
 * - Images excluded by default to prevent serialization errors
 * - Pagination support for smooth scrolling with thousands of products
 * - Newest products first for better UX
 * - Selective field loading
 * - Non-blocking async operations
 * - Caching for stats queries
 * - Filesystem-based image storage for fast queries
 */

import { ipcMain } from 'electron'
import { cacheService, CacheKeys } from '../../services/CacheService'
import { getImageService } from '../../services/ImageService'

export function registerProductsHandlers(prisma: any) {
  /**
   * Get all products - OPTIMIZED for large datasets
   * Excludes images by default, shows newest first, limits to 500 items
   */
  ipcMain.handle('products:getAll', async (_, options = {}) => {
    try {
      if (!prisma) return []

      const { 
        includeImages = false,
        limit = 500,
        offset = 0,
        searchTerm = '',
        category = ''
      } = options

      // Build where clause
      const where: any = {
        isArchived: false // Filter out archived products
      }
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm } },
          { baseSKU: { contains: searchTerm } },
          { description: { contains: searchTerm } }
        ]
      }
      if (category) {
        where.category = category
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          // Only load images if explicitly requested
          images: includeImages ? { 
            orderBy: { order: 'asc' },
            take: 1 // Only first image for list view
          } : false,
          variants: { 
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              sku: true,
              barcode: true,
              color: true,
              size: true,
              price: true,
              stock: true,
              createdAt: true,
              updatedAt: true
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }, // NEWEST FIRST
        take: limit,
        skip: offset
      })

      // Load image data from filesystem if requested
      if (includeImages) {
        const imageService = getImageService()
        for (const product of products) {
          if (product.images && product.images.length > 0) {
            for (const image of product.images) {
              if (image.filename) {
                const dataUrl = await imageService.getImageDataUrl(image.filename)
                ;(image as any).imageData = dataUrl
              }
            }
          }
        }
      }

      // Calculate total count for pagination
      const totalCount = await prisma.product.count({ where })

      return {
        products,
        totalCount,
        hasMore: offset + limit < totalCount
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  })

  /**
   * Get single product with all details including images
   * Used when viewing/editing product details
   */
  ipcMain.handle('products:getById', async (_, id: string) => {
    try {
      if (!prisma) return null

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: 'asc' } },
          variants: { 
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              productId: true,
              color: true,
              size: true,
              sku: true,
              barcode: true,
              price: true,
              cost: true,
              stock: true,
              createdAt: true,
              updatedAt: true
            }
          },
          store: true,
          category: true
        }
      })

      if (!product) return null

      // Load image data from filesystem
      const imageService = getImageService()
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          if (image.filename) {
            // Load Base64 data URL from file
            const dataUrl = await imageService.getImageDataUrl(image.filename)
            // Add imageData property for frontend compatibility
            ;(image as any).imageData = dataUrl
          }
        }
      }

      return product
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  })

  /**
   * Get single product variant by ID
   */
  ipcMain.handle('products:getVariantById', async (_, id: string) => {
    try {
      if (!prisma) return null

      const variant = await prisma.productVariant.findUnique({
        where: { id },
        select: {
          id: true,
          productId: true,
          color: true,
          size: true,
          sku: true,
          barcode: true,
          price: true,
          cost: true,
          stock: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return variant
    } catch (error) {
      console.error('Error fetching product variant:', error)
      throw error
    }
  })

  /**
   * Create product - optimized with transaction
   * Invalidates cache after creation
   */
  ipcMain.handle('products:create', async (_, productData) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const { images, variants, baseStock, category, ...product } = productData
      
      // Validate SKU uniqueness
      // For single variant mode, check baseSKU
      if (product.hasVariants === false && product.baseSKU) {
        const existingVariant = await prisma.productVariant.findUnique({
          where: { sku: product.baseSKU }
        })
        if (existingVariant) {
          return { success: false, message: `SKU "${product.baseSKU}" already exists. Please use a unique SKU.` }
        }
      }
      
      // For variants mode, check all variant SKUs
      if (variants?.length) {
        for (const variant of variants) {
          if (variant.sku) {
            const existingVariant = await prisma.productVariant.findUnique({
              where: { sku: variant.sku }
            })
            if (existingVariant) {
              return { success: false, message: `SKU "${variant.sku}" already exists. Please use a unique SKU.` }
            }
          }
        }
      }
      
      // If category is provided as a string (old format), we need to find or create the category
      let categoryId = product.categoryId
      
      if (category && !categoryId) {
        // Legacy support: category provided as string name
        const existingCategory = await prisma.category.findFirst({
          where: { name: category }
        })
        
        if (existingCategory) {
          categoryId = existingCategory.id
        } else {
          // Create new category if it doesn't exist
          const newCategory = await prisma.category.create({
            data: { name: category }
          })
          categoryId = newCategory.id
        }
      }
      
      // Save images to filesystem first
      const imageService = getImageService()
      const imageFilenames: Array<{ filename: string, order: number }> = []
      
      if (images?.length) {
        for (let idx = 0; idx < images.length; idx++) {
          const base64Data = images[idx]
          try {
            const filename = await imageService.saveImage(base64Data)
            imageFilenames.push({ filename, order: idx })
          } catch (error) {
            console.error(`Failed to save image ${idx}:`, error)
          }
        }
      }

      // Use transaction for atomic operation
      const newProduct = await prisma.$transaction(async (tx: any) => {
        return await tx.product.create({
          data: {
            ...product,
            categoryId, // Use the resolved categoryId
            images: imageFilenames.length ? {
              create: imageFilenames.map(({ filename, order }) => ({
                filename,
                order
              }))
            } : undefined,
            variants: variants?.length ? {
              create: variants.map((v: any) => ({
                color: v.color,
                size: v.size,
                sku: v.sku,
                barcode: v.barcode || undefined,
                price: v.price,
                cost: v.cost || undefined,
                stock: v.stock
              }))
            } : product.hasVariants === false && baseStock !== undefined ? {
              // Auto-create default variant for simple products
              create: [{
                sku: product.baseSKU,
                barcode: product.baseBarcode || undefined,
                color: 'Default',
                size: 'Default',
                price: product.basePrice,
                cost: product.baseCost || undefined,
                stock: baseStock
              }]
            } : undefined
          },
          include: {
            images: true,
            variants: true,
            store: true,
            category: true
          }
        })
      })
      
      // Load image data for response
      if (newProduct.images && newProduct.images.length > 0) {
        for (const image of newProduct.images) {
          if (image.filename) {
            const dataUrl = await imageService.getImageDataUrl(image.filename)
            ;(image as any).imageData = dataUrl
          }
        }
      }
      
      // Invalidate product-related caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')
      
      return { success: true, product: newProduct }
    } catch (error: any) {
      console.error('Error creating product:', error)
      
      // Check for duplicate barcode error
      if (error.code === 'P2002' && error.meta?.target?.includes('barcode')) {
        return { success: false, message: 'This barcode is already used by another product. Please use a unique barcode.' }
      }
      
      // Check for duplicate SKU error
      if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
        return { success: false, message: 'This SKU is already used by another product. Please use a unique SKU.' }
      }
      
      return { success: false, message: error.message || 'Failed to create product. Please try again.' }
    }
  })

  /**
   * Update product - optimized with transaction
   * Invalidates cache after update
   */
  ipcMain.handle('products:update', async (_, { id, productData }) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const { images, variants, baseStock, category, ...product } = productData
      
      // Validate SKU uniqueness (excluding current product's variants)
      // For single variant mode, check baseSKU
      if (product.hasVariants === false && product.baseSKU) {
        const existingVariant = await prisma.productVariant.findFirst({
          where: { 
            sku: product.baseSKU,
            productId: { not: id }
          }
        })
        if (existingVariant) {
          return { success: false, message: `SKU "${product.baseSKU}" already exists in another product. Please use a unique SKU.` }
        }
      }
      
      // For variants mode, check all variant SKUs
      if (variants?.length) {
        for (const variant of variants) {
          if (variant.sku) {
            const existingVariant = await prisma.productVariant.findFirst({
              where: { 
                sku: variant.sku,
                productId: { not: id }
              }
            })
            if (existingVariant) {
              return { success: false, message: `SKU "${variant.sku}" already exists in another product. Please use a unique SKU.` }
            }
          }
        }
      }
      
      // If category is provided as a string (old format), we need to find or create the category
      let categoryId = product.categoryId
      
      if (category && !categoryId) {
        // Legacy support: category provided as string name
        const existingCategory = await prisma.category.findFirst({
          where: { name: category }
        })
        
        if (existingCategory) {
          categoryId = existingCategory.id
        } else {
          // Create new category if it doesn't exist
          const newCategory = await prisma.category.create({
            data: { name: category }
          })
          categoryId = newCategory.id
        }
      }
      
      // Get existing images to compare
      const imageService = getImageService()
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { images: { orderBy: { order: 'asc' } } }
      })

      // Build map of existing image data URLs to filenames
      const existingImageMap = new Map<string, string>()
      if (existingProduct?.images) {
        for (const img of existingProduct.images) {
          if (img.filename) {
            const dataUrl = await imageService.getImageDataUrl(img.filename)
            if (dataUrl) {
              existingImageMap.set(dataUrl, img.filename)
            }
          }
        }
      }

      // Process images: separate existing from new
      const imageFilenames: Array<{ filename: string, order: number }> = []
      
      if (images?.length) {
        for (let idx = 0; idx < images.length; idx++) {
          const imageData = images[idx]
          
          // Check if this matches an existing image
          if (existingImageMap.has(imageData)) {
            // This is an existing image - reuse the filename
            const filename = existingImageMap.get(imageData)!
            imageFilenames.push({ filename, order: idx })
          } else if (imageData.startsWith('data:image/')) {
            // This is a new image - save to filesystem
            try {
              const filename = await imageService.saveImage(imageData)
              imageFilenames.push({ filename, order: idx })
            } catch (error) {
              console.error(`Failed to save new image ${idx}:`, error)
            }
          } else {
            console.warn(`[products:update] Unrecognized image format at index ${idx}`)
          }
        }
      }

      // Use transaction for atomic operation
      const updated = await prisma.$transaction(async (tx: any) => {
        // Get existing variants to track stock changes
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true, sku: true, stock: true, color: true, size: true, price: true, barcode: true }
        })
        
        // Build map of existing variants by SKU for comparison
        const existingVariantMap = new Map(existingVariants.map(v => [v.sku, v]))
        
        // Delete existing images from database
        await tx.productImage.deleteMany({ where: { productId: id } })
        
        // Handle variants
        let variantData: any = undefined
        
        if (variants?.length) {
          // Process each variant
          const variantsToCreate: any[] = []
          const variantsToUpdate: any[] = []
          const skusToKeep = new Set<string>()
          
          for (const v of variants) {
            skusToKeep.add(v.sku)
            const existing = existingVariantMap.get(v.sku)
            
            if (existing) {
              // Update existing variant
              const updates: any = {}
              let needsUpdate = false
              
              // Check for changes (excluding stock - stock is only modified via stock movement dialog)
              if (v.color !== (existing as any).color) { updates.color = v.color; needsUpdate = true }
              if (v.size !== (existing as any).size) { updates.size = v.size; needsUpdate = true }
              if (v.price !== (existing as any).price) { updates.price = v.price; needsUpdate = true }
              if (v.barcode !== (existing as any).barcode) { updates.barcode = v.barcode; needsUpdate = true }
              // Stock is NOT updated here - use stock movement dialog to change stock
              
              if (needsUpdate) {
                variantsToUpdate.push({ sku: v.sku, updates })
              }
            } else {
              // New variant
              variantsToCreate.push({
                color: v.color,
                size: v.size,
                sku: v.sku,
                barcode: v.barcode,
                price: v.price,
                stock: v.stock
              })
            }
          }
          
          // Delete variants that are no longer present
          const skusToDelete = existingVariants
            .filter(v => !skusToKeep.has(v.sku))
            .map(v => v.sku)
          
          if (skusToDelete.length > 0) {
            await tx.productVariant.deleteMany({
              where: { productId: id, sku: { in: skusToDelete } }
            })
          }
          
          // Apply variant updates
          for (const { sku, updates } of variantsToUpdate) {
            await tx.productVariant.updateMany({
              where: { productId: id, sku },
              data: updates
            })
          }
          
          // Create new variants
          if (variantsToCreate.length > 0) {
            variantData = { create: variantsToCreate }
          }
        } else if (product.hasVariants === false && baseStock !== undefined) {
          // Handle simple product (no variants) - check if default variant exists
          const defaultVariant = existingVariants.find(v => v.sku === product.baseSKU)
          
          if (defaultVariant) {
            // Update default variant (excluding stock - use stock movement dialog)
            // Also update barcode and cost if product has them
            await tx.productVariant.updateMany({
              where: { productId: id, sku: product.baseSKU },
              data: { 
                price: product.basePrice,
                barcode: product.baseBarcode || undefined,
                cost: product.baseCost || undefined
              }
            })
          } else if (!defaultVariant) {
            // Create default variant
            variantData = {
              create: [{
                sku: product.baseSKU,
                barcode: product.baseBarcode || undefined,
                color: 'Default',
                size: 'Default',
                price: product.basePrice,
                cost: product.baseCost || undefined,
                stock: baseStock
              }]
            }
          }
        }
        
        // Update product with new data
        return await tx.product.update({
          where: { id },
          data: {
            ...product,
            categoryId, // Use the resolved categoryId
            images: imageFilenames.length ? {
              create: imageFilenames.map(({ filename, order }) => ({
                filename,
                order
              }))
            } : undefined,
            variants: variantData
          },
          include: {
            images: true,
            variants: true,
            store: true,
            category: true
          }
        })
      })

      // Delete old image files from filesystem (after successful transaction)
      // Only delete images that are not in the new image list
      if (existingProduct?.images && imageFilenames.length > 0) {
        const newFilenames = imageFilenames.map(img => img.filename)
        const filesToDelete = existingProduct.images
          .filter(img => img.filename && !newFilenames.includes(img.filename))
          .map(img => img.filename)
        
        if (filesToDelete.length > 0) {
          console.log(`[products:update] Scheduling deletion of ${filesToDelete.length} unused images`)
          // Small delay to ensure UI has updated before deleting
          setTimeout(async () => {
            for (const filename of filesToDelete) {
              try {
                await imageService.deleteImage(filename)
                console.log(`[products:update] Deleted old image: ${filename}`)
              } catch (err) {
                console.error(`Failed to delete old image ${filename}:`, err)
              }
            }
          }, 2000)
        }
      }

      // Load image data for response
      if (updated.images && updated.images.length > 0) {
        for (const image of updated.images) {
          if (image.filename) {
            const dataUrl = await imageService.getImageDataUrl(image.filename)
            ;(image as any).imageData = dataUrl
          }
        }
      }
      
      // Invalidate caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')
      cacheService.delete(CacheKeys.productById(id))
      
      return { success: true, product: updated }
    } catch (error: any) {
      console.error('Error updating product:', error)
      
      // Check for duplicate barcode error
      if (error.code === 'P2002' && error.meta?.target?.includes('barcode')) {
        return { success: false, message: 'This barcode is already used by another product variant. Please use a unique barcode.' }
      }
      
      // Check for duplicate SKU error
      if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
        return { success: false, message: 'This SKU is already used by another product. Please use a unique SKU.' }
      }
      
      return { success: false, message: error.message || 'Failed to update product. Please try again.' }
    }
  })

  /**
   * Delete product - with cascade cleanup
   * Invalidates cache after deletion
   */
  ipcMain.handle('products:delete', async (_, id) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      // Check if product has any sales
      const salesCount = await prisma.saleItem.count({
        where: { productId: id }
      })

      if (salesCount > 0) {
        return { 
          success: false, 
          message: `Cannot delete product with ${salesCount} sales. Archive it instead.` 
        }
      }

      // Get product images before deletion
      const imageService = getImageService()
      const product = await prisma.product.findUnique({
        where: { id },
        include: { images: true }
      })

      // Prisma will cascade delete images and variants automatically
      await prisma.product.delete({ where: { id } })

      // Delete image files from filesystem
      if (product?.images) {
        for (const image of product.images) {
          if (image.filename) {
            try {
              await imageService.deleteImage(image.filename)
            } catch (error) {
              console.error(`Failed to delete image file ${image.filename}:`, error)
            }
          }
        }
      }
      
      // Invalidate caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')
      cacheService.delete(CacheKeys.productById(id))
      
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting product:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Get product statistics for dashboard
   * Uses raw SQL for performance + caching
   */
  ipcMain.handle('products:getStats', async () => {
    try {
      if (!prisma) return null

      // Try cache first
      return await cacheService.getOrCompute(
        CacheKeys.PRODUCT_STATS,
        async () => {
          const [totalProducts] = await prisma.$queryRaw<[{ count: number }]>`
            SELECT COUNT(*) as count FROM Product
          `

          const [totalVariants] = await prisma.$queryRaw<[{ count: number }]>`
            SELECT COUNT(*) as count FROM ProductVariant
          `

          const [lowStock] = await prisma.$queryRaw<[{ count: number }]>`
            SELECT COUNT(DISTINCT productId) as count
            FROM ProductVariant
            WHERE stock > 0 AND stock <= 10
          `

          return {
            totalProducts: Number(totalProducts.count || 0),
            totalVariants: Number(totalVariants.count || 0),
            lowStockCount: Number(lowStock.count || 0)
          }
        },
        60 * 1000 // Cache for 1 minute
      )
    } catch (error) {
      console.error('Error fetching product stats:', error)
      throw error
    }
  })

  /**
   * Search products - optimized for POS QuickSale
   * Fast search with stock calculation and proper typing
   * Note: SQLite is case-insensitive by default for ASCII, no mode needed
   */
  ipcMain.handle('products:search', async (_, options: { query?: string; limit?: number } = {}) => {
    try {
      if (!prisma) return []
      
      const { query = '', limit = 50 } = options
      
      if (!query || query.trim() === '') return []

      const products = await prisma.product.findMany({
        where: {
          isArchived: false, // Filter out archived products
          OR: [
            { name: { contains: query } },
            { baseSKU: { contains: query } },
            { description: { contains: query } }
          ]
        },
        include: {
          variants: {
            select: {
              stock: true
            }
          }
        },
        take: limit,
        orderBy: [
          // Prioritize exact matches first
          { name: 'asc' }
        ]
      })

      // Calculate total stock for each product
      return products.map(product => ({
        id: product.id,
        name: product.name,
        baseSKU: product.baseSKU,
        category: product.category,
        basePrice: product.basePrice,
        totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
        imageUrl: null // Can be enhanced later
      }))
    } catch (error) {
      console.error('Error searching products:', error)
      throw error
    }
  })

  /**
   * Search products with pagination and filters - OPTIMIZED for POS
   * Supports server-side filtering, sorting, and pagination
   */
  ipcMain.handle('products:searchPaginated', async (_, options = {}) => {
    try {
      if (!prisma) return { products: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false } }

      const { 
        searchTerm = '',
        category = '',
        stockStatus = [],
        priceMin,
        priceMax,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 50,
        includeImages = false 
      } = options
      
      // Build where clause
      const where: any = {}
      
      // Search filter
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm } },
          { baseSKU: { contains: searchTerm } },
          { description: { contains: searchTerm } }
        ]
      }
      
      // Category filter
      if (category) {
        where.category = category
      }
      
      // Price range filter
      if (priceMin !== undefined || priceMax !== undefined) {
        where.basePrice = {}
        if (priceMin !== undefined) where.basePrice.gte = priceMin
        if (priceMax !== undefined) where.basePrice.lte = priceMax
      }
      
      // Stock status filter (requires checking variants)
      if (stockStatus.length > 0) {
        if (stockStatus.includes('out')) {
          // Products with all variants out of stock
          where.variants = { none: { stock: { gt: 0 } } }
        } else if (stockStatus.includes('low')) {
          // Products with low stock (1-10 units)
          where.variants = { some: { stock: { lte: 10, gt: 0 } } }
        } else if (stockStatus.includes('normal') || stockStatus.includes('high')) {
          // Products with normal/high stock (> 10 units)
          where.variants = { some: { stock: { gt: 10 } } }
        }
      }
      
      // Execute query with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            images: includeImages ? { 
              orderBy: { order: 'asc' },
              take: 1 
            } : false,
            variants: {
              select: {
                id: true,
                color: true,
                size: true,
                sku: true,
                price: true,
                stock: true
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: (page - 1) * limit
        }),
        prisma.product.count({ where })
      ])
      
      // Calculate total pages
      const totalPages = Math.ceil(total / limit)
      
      return {
        products: products.map(p => ({
          ...p,
          totalStock: p.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    } catch (error) {
      console.error('Error searching products with pagination:', error)
      throw error
    }
  })

  /**
   * Get available categories - OPTIMIZED
   * Returns unique list of categories
   */
  ipcMain.handle('products:getCategories', async () => {
    try {
      if (!prisma) return []

      const categories = await prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' }
      })

      return categories.map(c => c.category).filter(Boolean)
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  })

  /**
   * Batch create products - for bulk imports
   * Performance: Single transaction for all products
   */
  ipcMain.handle('products:batchCreate', async (_, productsData: any[]) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      if (!productsData?.length) {
        return { success: false, message: 'No products provided' }
      }

      // Use transaction to create all products atomically
      const results = await prisma.$transaction(
        productsData.map((productData) => {
          const { images, variants, baseStock, ...product } = productData
          
          return prisma.product.create({
            data: {
              ...product,
              images: images?.length ? {
                create: images.map((img: string, idx: number) => ({
                  imageData: img,
                  order: idx
                }))
              } : undefined,
              variants: variants?.length ? {
                create: variants.map((v: any) => ({
                  color: v.color,
                  size: v.size,
                  sku: v.sku,
                  barcode: v.barcode || undefined,
                  price: v.price,
                  cost: v.cost || undefined,
                  stock: v.stock
                }))
              } : undefined
            }
          })
        })
      )

      // Invalidate caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')

      return { 
        success: true, 
        created: results.length,
        message: `Successfully created ${results.length} products`
      }
    } catch (error: any) {
      console.error('Error batch creating products:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Batch update products - for bulk edits
   */
  ipcMain.handle('products:batchUpdate', async (_, updates: Array<{ id: string; data: any }>) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      if (!updates?.length) {
        return { success: false, message: 'No updates provided' }
      }

      // Use transaction for atomicity
      const results = await prisma.$transaction(
        updates.map(({ id, data }) => {
          return prisma.product.update({
            where: { id },
            data
          })
        })
      )

      // Invalidate caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')
      updates.forEach(({ id }) => cacheService.delete(CacheKeys.productById(id)))

      return { 
        success: true, 
        updated: results.length,
        message: `Successfully updated ${results.length} products`
      }
    } catch (error: any) {
      console.error('Error batch updating products:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Batch delete products
   */
  ipcMain.handle('products:batchDelete', async (_, ids: string[]) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      if (!ids?.length) {
        return { success: false, message: 'No IDs provided' }
      }

      // Delete all products in one operation
      const result = await prisma.product.deleteMany({
        where: {
          id: { in: ids }
        }
      })

      // Invalidate caches
      cacheService.invalidatePattern('products:*')
      cacheService.invalidatePattern('inventory:*')
      ids.forEach(id => cacheService.delete(CacheKeys.productById(id)))

      return { 
        success: true, 
        deleted: result.count,
        message: `Successfully deleted ${result.count} products`
      }
    } catch (error: any) {
      console.error('Error batch deleting products:', error)
      return { success: false, message: error.message }
    }
  })
}
