/**
 * Universal Search Handlers
 * Unified backend search for Products, Inventory, and POS
 * 
 * Performance Optimizations:
 * - Server-side filtering and pagination
 * - Optimized Prisma queries with selective field loading
 * - Category filtering with database joins
 * - Stock status calculation at database level
 * - Debounce handling on frontend
 * - Filesystem-based image loading for fast queries
 * 
 * Design Pattern: Repository + Factory
 * - Repository: Abstracts database queries
 * - Factory: Creates enriched data with calculated fields
 */

import { ipcMain } from 'electron'
import { InventoryService } from '../../services/InventoryService'
import { PredictionService } from '../../services/PredictionService'
import { getImageService } from '../../services/ImageService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Search')

interface SearchFilters {
  query?: string
  barcode?: string
  categoryIds?: string[]
  stockStatus?: ('out' | 'low' | 'normal' | 'high')[]
  priceRange?: { min: number; max: number }
  stockRange?: { min: number; max: number }
  colors?: string[]
  sizes?: string[]
  storeId?: string
}

interface SearchOptions {
  filters: SearchFilters
  sort?: { field: string; direction: 'asc' | 'desc' }
  pagination: { page: number; limit: number }
  includeImages?: boolean
  includeMetrics?: boolean
  enrichData?: boolean
}

export function registerSearchHandlers(prisma: any) {
  /**
   * Universal Products Search
   * Supports all filtering options for POS, Products, and Inventory pages
   */
  ipcMain.handle('search:products', async (_, options: SearchOptions) => {
    try {
      if (!prisma) {
        log.warn('[search:products] Prisma not initialized - returning empty results')
        return { 
          items: [], 
          totalCount: 0,
          page: 1,
          totalPages: 0,
          hasMore: false
        }
      }

      const {
        filters,
        sort = { field: 'name', direction: 'asc' },
        pagination,
        includeImages = false,
        enrichData = false
      } = options

      // Build WHERE clause with proper AND/OR logic
      const where = buildWhereClause(filters)
      
      // Log search parameters in development only
      if (process.env.NODE_ENV === 'development' && filters.query) {
        log.info('[search:products] Searching for:', filters.query.substring(0, 20))
      }

      // Execute query with pagination
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true
              }
            },
            variants: {
              select: {
                id: true,
                color: true,
                size: true,
                sku: true,
                barcode: true,
                price: true,
                stock: true,
                createdAt: true,
                updatedAt: true
              },
              orderBy: { createdAt: 'asc' }
            },
            images: includeImages ? {
              orderBy: { order: 'asc' },
              take: 1 // Only first image for list view
            } : false,
            store: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          },
          orderBy: buildOrderByClause(sort),
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit
        }),
        prisma.product.count({ where })
      ])

      // Load image data from filesystem if requested
      if (includeImages) {
        const imageService = getImageService()
        let loadedCount = 0
        for (const product of products) {
          if (product.images && product.images.length > 0) {
            for (const image of product.images) {
              if (image.filename) {
                const dataUrl = await imageService.getImageDataUrl(image.filename)
                ;(image as any).imageData = dataUrl
                loadedCount++
              }
            }
          }
        }
      } 

      // Enrich products with calculated fields
      const items = enrichData
        ? products.map(p => enrichProduct(p))
        : products.map(p => ({
            ...p,
            category: p.category?.name || 'Uncategorized',
            totalStock: p.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
          }))

      const totalPages = Math.ceil(totalCount / pagination.limit)

      return {
        items,
        totalCount,
        page: pagination.page,
        totalPages,
        hasMore: pagination.page < totalPages
      }
    } catch (error) {
      log.error('Error in search:products:', error)
      throw error
    }
  })

  /**
   * Inventory-Specific Search with Metrics
   * Uses InventoryService for enrichment
   */
  ipcMain.handle('search:inventory', async (_, options: SearchOptions) => {
    try {
      if (!prisma) {
        return {
          items: [],
          totalCount: 0,
          page: 1,
          totalPages: 0,
          hasMore: false,
          metrics: null
        }
      }

      const {
        filters,
        sort = { field: 'name', direction: 'asc' },
        pagination,
        includeImages = false,
        includeMetrics = true
      } = options

      const where = buildWhereClause(filters)

      // Get inventory service for enrichment
      const inventoryService = InventoryService.getInstance(prisma)

      // Execute query
      const [products, totalCount, metrics] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            variants: {
              select: {
                id: true,
                color: true,
                size: true,
                sku: true,
                barcode: true,
                price: true,
                stock: true,
                createdAt: true,
                updatedAt: true
              },
              orderBy: { createdAt: 'asc' }
            },
            images: includeImages ? {
              orderBy: { order: 'asc' }
            } : false,
            store: {
              select: {
                id: true,
                name: true,
                location: true
              }
            }
          },
          orderBy: buildOrderByClause(sort),
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit
        }),
        prisma.product.count({ where }),
        includeMetrics ? inventoryService.getInventoryMetrics() : Promise.resolve(null)
      ])

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

      // Enrich items using InventoryService pattern
      const items = products.map(product => {
        const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
        const stockValue = product.variants.reduce(
          (sum: number, v: any) => sum + (v.price * 0.6 * v.stock), 
          0
        )
        const retailValue = product.variants.reduce(
          (sum: number, v: any) => sum + (v.price * v.stock), 
          0
        )

        let stockStatus: 'out' | 'low' | 'normal' | 'high'
        if (totalStock === 0) stockStatus = 'out'
        else if (totalStock <= 10) stockStatus = 'low'
        else if (totalStock <= 50) stockStatus = 'normal'
        else stockStatus = 'high'

        return {
          ...product,
          category: product.category?.name || 'Uncategorized',
          totalStock,
          stockValue,
          retailValue,
          variantCount: product.variants.length,
          stockStatus
        }
      })

      const totalPages = Math.ceil(totalCount / pagination.limit)

      return {
        items,
        totalCount,
        page: pagination.page,
        totalPages,
        hasMore: pagination.page < totalPages,
        metrics
      }
    } catch (error) {
      log.error('Error in search:inventory:', error)
      throw error
    }
  })

  /**
   * Get filter metadata (categories, price range, etc.)
   * Used to populate filter dropdowns
   */
  ipcMain.handle('search:getFilterMetadata', async () => {
    try {
      if (!prisma) return null

      const [categories, variants, priceStats] = await Promise.all([
        // Get all categories with product counts
        prisma.category.findMany({
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            _count: {
              select: { products: true }
            }
          },
          orderBy: { name: 'asc' }
        }),

        // Get unique colors and sizes
        prisma.productVariant.findMany({
          select: {
            color: true,
            size: true
          },
          distinct: ['color', 'size']
        }),

        // Get price range
        prisma.$queryRaw<[{ min: number; max: number }]>`
          SELECT 
            MIN(basePrice) as min,
            MAX(basePrice) as max
          FROM Product
        `
      ])

      // Extract unique colors and sizes
      const colors = [...new Set(variants.map(v => v.color).filter(Boolean))].sort()
      const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))].sort()

      return {
        categories,
        colors,
        sizes,
        priceRange: {
          min: priceStats[0]?.min || 0,
          max: priceStats[0]?.max || 1000
        }
      }
    } catch (error) {
      log.error('Error getting filter metadata:', error)
      throw error
    }
  })

  /**
   * Sales Search Handler
   * Backend filtering for Finance page with date range support
   */
  ipcMain.handle('search:sales', async (_, options: {
    filters: {
      startDate?: string
      endDate?: string
      customerId?: string
      employeeId?: string
      minAmount?: number
      maxAmount?: number
      query?: string
    }
    sort?: { field: string; direction: 'asc' | 'desc' }
    pagination: { page: number; limit: number }
  }) => {
    try {
      if (!prisma) {
        return {
          sales: [],
          totalCount: 0,
          page: 1,
          totalPages: 0,
          hasMore: false
        }
      }

      const {
        filters,
        sort = { field: 'createdAt', direction: 'desc' },
        pagination
      } = options

      // Build WHERE clause for sales
      const where: any = {}

      // Date range filtering
      if (filters.startDate || filters.endDate) {
        where.createdAt = {}
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate)
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate)
        }
      }

      // Amount range filtering
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.total = {}
        if (filters.minAmount !== undefined) {
          where.total.gte = filters.minAmount
        }
        if (filters.maxAmount !== undefined) {
          where.total.lte = filters.maxAmount
        }
      }

      // Customer/Employee filtering
      if (filters.customerId) {
        where.customerId = filters.customerId
      }
      if (filters.employeeId) {
        where.userId = filters.employeeId
      }

      // Search query (customer name or sale ID)
      if (filters.query) {
        where.OR = [
          { id: { contains: filters.query } },
          { customerName: { contains: filters.query } }
        ]
      }

      // Execute queries
      const [sales, totalCount] = await Promise.all([
        prisma.saleTransaction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    baseSKU: true
                  }
                }
              }
            }
          },
          orderBy: { [sort.field]: sort.direction },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit
        }),
        prisma.saleTransaction.count({ where })
      ])

      const totalPages = Math.ceil(totalCount / pagination.limit)

      return {
        sales,
        totalCount,
        page: pagination.page,
        totalPages,
        hasMore: pagination.page < totalPages
      }
    } catch (error) {
      log.error('Error searching sales:', error)
      throw error
    }
  })

  /**
   * Finance Dashboard Data Handler
   * Comprehensive financial metrics with date range support
   */
  ipcMain.handle('search:finance', async (_, options: {
    startDate?: string
    endDate?: string
    previousStartDate?: string
    previousEndDate?: string
  }) => {
    try {
      if (!prisma) {
        return {
          currentMetrics: {},
          previousMetrics: {},
          topProducts: [],
          salesByDay: [],
          salesByCategory: []
        }
      }

      const { startDate, endDate, previousStartDate, previousEndDate } = options

      // Build date filters
      const currentWhere: any = {}
      const previousWhere: any = {}

      if (startDate && endDate) {
        currentWhere.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }

      if (previousStartDate && previousEndDate) {
        previousWhere.createdAt = {
          gte: new Date(previousStartDate),
          lte: new Date(previousEndDate)
        }
      }

      // Fetch current period data using SaleTransaction and SaleItem, plus operational expenses
      // Include both completed and partially_refunded transactions
      const [currentTransactions, previousTransactions, currentExpenses, previousExpenses] = await Promise.all([
        prisma.saleTransaction.findMany({
          where: { 
            ...currentWhere, 
            status: { in: ['completed', 'partially_refunded'] }
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }),
        prisma.saleTransaction.findMany({
          where: { 
            ...previousWhere, 
            status: { in: ['completed', 'partially_refunded'] }
          },
          select: {
            id: true,
            total: true,
            subtotal: true,
            createdAt: true,
            items: {
              select: {
                refundedQuantity: true,
                price: true
              }
            }
          }
        }),
        prisma.financialTransaction.findMany({
          where: { ...currentWhere, type: 'expense' },
          select: {
            amount: true
          }
        }),
        prisma.financialTransaction.findMany({
          where: { ...previousWhere, type: 'expense' },
          select: {
            amount: true
          }
        })
      ])

      // Calculate current metrics accounting for refunds
      let currentRevenue = 0
      let totalRefundedAmount = 0
      let totalRefundedItems = 0
      
      currentTransactions.forEach(txn => {
        // Calculate refunded amount for this transaction
        const refundedAmount = txn.items.reduce((sum, item) => {
          const refunded = item.refundedQuantity || 0
          if (refunded > 0) {
            totalRefundedItems += refunded
            return sum + (refunded * item.price)
          }
          return sum
        }, 0)
        
        totalRefundedAmount += refundedAmount
        // Net revenue = subtotal (pre-tax) - refunded
        // Tax is collected for the government, not business income
        currentRevenue += ((txn.subtotal ?? txn.total) - refundedAmount)
      })
      
      const currentTransactionCount = currentTransactions.length

      // Calculate previous metrics accounting for refunds
      let previousRevenue = 0
      let previousRefundedAmount = 0
      
      previousTransactions.forEach(txn => {
        const refundedAmount = txn.items.reduce((sum, item) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        previousRefundedAmount += refundedAmount
        // Use subtotal (pre-tax) for revenue calculation
        previousRevenue += ((txn.subtotal ?? txn.total) - refundedAmount)
      })
      
      const previousTransactionCount = previousTransactions.length

      // Calculate changes
      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0
      const transactionsChange = previousTransactionCount > 0
        ? ((currentTransactionCount - previousTransactionCount) / previousTransactionCount) * 100
        : 0

      // Average order value
      const avgOrderValue = currentTransactionCount > 0 ? currentRevenue / currentTransactionCount : 0
      const previousAvgOrderValue = previousTransactionCount > 0 ? previousRevenue / previousTransactionCount : 0
      const avgOrderValueChange = previousAvgOrderValue > 0
        ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) * 100
        : 0

      // Top products analysis from transaction items (excluding refunded items)
      const productSales = new Map<string, { name: string; revenue: number; qty: number; cost: number }>()
      
      // Calculate total cost and profit from ALL transaction items (excluding refunds)
      let totalCost = 0
      let totalRevenue = 0
      
      currentTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const productId = item.product.id
          const productName = item.product.name
          
          // Calculate active (non-refunded) quantities and revenue
          const refundedQty = item.refundedQuantity || 0
          const activeQty = item.quantity - refundedQty
          const refundedRevenue = refundedQty * item.price
          const activeRevenue = item.total - refundedRevenue
          
          // Cost calculation: use baseCost from product (actual cost) for active items only
          const unitCost = item.product.baseCost || 0
          const activeCost = activeQty * unitCost
          
          // Accumulate total cost and revenue for ALL products (active items only)
          totalCost += activeCost
          totalRevenue += activeRevenue
          
          if (productSales.has(productId)) {
            const existing = productSales.get(productId)!
            existing.revenue += activeRevenue
            existing.qty += activeQty
            existing.cost += activeCost
          } else {
            productSales.set(productId, { name: productName, revenue: activeRevenue, qty: activeQty, cost: activeCost })
          }
        })
      })

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          revenue: p.revenue,
          quantity: p.qty,
          cost: p.cost,
          profit: p.revenue - p.cost,
          profitMargin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
        }))

      // Sales by day (accounting for refunds)
      const salesByDay = new Map<string, number>()
      currentTransactions.forEach(transaction => {
        const day = new Date(transaction.createdAt).toISOString().split('T')[0]
        
        // Calculate net revenue for this transaction
        const refundedAmount = transaction.items.reduce((sum, item) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        const netRevenue = transaction.total - refundedAmount
        salesByDay.set(day, (salesByDay.get(day) || 0) + netRevenue)
      })

      const salesByDayArray = Array.from(salesByDay.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Sales by category (accounting for refunds)
      const categoryMap = new Map<string, number>()
      currentTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const categoryName = item.product.category?.name || 'Uncategorized'
          
          // Calculate active revenue (excluding refunded items)
          const refundedQty = item.refundedQuantity || 0
          const refundedRevenue = refundedQty * item.price
          const activeRevenue = item.total - refundedRevenue
          
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + activeRevenue)
        })
      })

      const salesByCategory = Array.from(categoryMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)

      // Calculate operational expenses for current and previous periods
      const totalOperationalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      const previousTotalExpenses = previousExpenses.reduce((sum, exp) => sum + exp.amount, 0)


      // Calculate profit metrics from ALL sales INCLUDING operational expenses
      // Always include COGS in calculations - COGS is a real business cost
      const grossProfit = totalRevenue - totalCost
      const totalProfit = grossProfit - totalOperationalExpenses
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      // Calculate previous period profit for comparison
      const costRatio = totalRevenue > 0 ? totalCost / totalRevenue : 0
      const previousGrossProfit = previousRevenue - (previousRevenue * costRatio)
      const previousTotalProfit = previousGrossProfit - previousTotalExpenses
      const profitChange = previousTotalProfit > 0 
        ? ((totalProfit - previousTotalProfit) / previousTotalProfit) * 100 
        : 0


      // Calculate refund statistics
      const refundedTransactionsCount = currentTransactions.filter(t => 
        t.status === 'partially_refunded' || t.items.some(i => (i.refundedQuantity || 0) > 0)
      ).length
      
      const refundRate = currentTransactionCount > 0 
        ? (refundedTransactionsCount / currentTransactionCount) * 100 
        : 0

      return {
        currentMetrics: {
          revenue: currentRevenue,
          transactions: currentTransactionCount,
          avgOrderValue,
          revenueChange,
          transactionsChange,
          avgOrderValueChange,
          totalProfit,
          profitMargin,
          totalCost,
          totalExpenses: totalOperationalExpenses,
          grossProfit,
          profitChange,
          // Refund statistics
          totalRefunded: totalRefundedAmount,
          refundedItems: totalRefundedItems,
          refundedTransactions: refundedTransactionsCount,
          refundRate
        },
        previousMetrics: {
          revenue: previousRevenue,
          transactions: previousTransactionCount,
          avgOrderValue: previousAvgOrderValue,
          totalRefunded: previousRefundedAmount
        },
        topProducts,
        salesByDay: salesByDayArray,
        salesByCategory
      }
    } catch (error) {
      log.error('Error fetching finance data:', error)
      throw error
    }
  })

  /**
   * Prediction & Analytics Handlers
   * Advanced forecasting and insights
   */
  
  // Revenue forecasting
  ipcMain.handle('forecast:revenue', async (_, options: { days?: number; historicalDays?: number }) => {
    try {
      if (!prisma) {
        throw new Error('Database not initialized')
      }
      
      const predictionService = new PredictionService(prisma)
      const forecast = await predictionService.forecastRevenue(
        options.days || 30,
        options.historicalDays || 90
      )
      
      return forecast
    } catch (error) {
      log.error('Error forecasting revenue:', error)
      throw error
    }
  })
  
  // Cash flow projection
  ipcMain.handle('forecast:cashflow', async (_, options: { days?: number }) => {
    try {
      if (!prisma) {
        throw new Error('Database not initialized')
      }
      
      const predictionService = new PredictionService(prisma)
      const projection = await predictionService.projectCashFlow(options.days || 30)
      
      return projection
    } catch (error) {
      log.error('Error projecting cash flow:', error)
      throw error
    }
  })
  
  // Product insights
  ipcMain.handle('insights:products', async (_, options: { limit?: number }) => {
    try {
      if (!prisma) {
        throw new Error('Database not initialized')
      }
      
      const predictionService = new PredictionService(prisma)
      const insights = await predictionService.generateProductInsights(options.limit || 10)
      
      return insights
    } catch (error) {
      log.error('Error generating product insights:', error)
      throw error
    }
  })
  
  // Financial health
  ipcMain.handle('health:financial', async () => {
    try {
      if (!prisma) {
        throw new Error('Database not initialized')
      }
      
      const predictionService = new PredictionService(prisma)
      const health = await predictionService.calculateFinancialHealth()
      
      return health
    } catch (error) {
      log.error('Error calculating financial health:', error)
      throw error
    }
  })
}

/**
 * Build Prisma WHERE clause from filters
 * Properly combines multiple filter conditions using AND logic
 */
function buildWhereClause(filters: SearchFilters): any {
  const where: any = {}
  const andConditions: any[] = []

  // Filter archived products by default (unless explicitly requested)
  if ((filters as any).showArchivedOnly) {
    // Show only archived products
    andConditions.push({ isArchived: true })
  } else if (!(filters as any).includeArchived) {
    // Default: exclude archived products
    andConditions.push({ isArchived: false })
  }
  // If includeArchived is true, don't filter by isArchived at all (show both)

  // Barcode search - prioritize exact match (fastest lookup)
  if ((filters as any).barcode && (filters as any).barcode.trim()) {
    const barcode = (filters as any).barcode.trim()
    andConditions.push({
      variants: {
        some: {
          barcode: { equals: barcode }
        }
      }
    })
  }
  // Text search across multiple fields including barcode (OR within this group)
  else if (filters.query && filters.query.trim()) {
    const query = filters.query.trim()
    andConditions.push({
      OR: [
        { name: { contains: query } },
        { baseSKU: { contains: query } },
        { description: { contains: query } },
        // Include barcode in text search
        { variants: { some: { barcode: { contains: query } } } }
      ]
    })
  }

  // Category filter
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    // Check if categoryIds are UUIDs or names
    const firstId = filters.categoryIds[0]
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstId)
    
    if (isUUID) {
      // Filter by category IDs
      andConditions.push({ categoryId: { in: filters.categoryIds } })
    } else {
      // Filter by category names
      andConditions.push({
        category: {
          name: { in: filters.categoryIds }
        }
      })
    }
  }

  // Store filter
  if (filters.storeId) {
    andConditions.push({ storeId: filters.storeId })
  }

  // Price range
  if (filters.priceRange) {
    const priceCondition: any = {}
    if (filters.priceRange.min !== undefined) {
      priceCondition.gte = filters.priceRange.min
    }
    if (filters.priceRange.max !== undefined) {
      priceCondition.lte = filters.priceRange.max
    }
    if (Object.keys(priceCondition).length > 0) {
      andConditions.push({ basePrice: priceCondition })
    }
  }

  // Color filter (variant-based)
  if (filters.colors && filters.colors.length > 0) {
    andConditions.push({
      variants: {
        some: {
          color: { in: filters.colors }
        }
      }
    })
  }

  // Size filter (variant-based)
  if (filters.sizes && filters.sizes.length > 0) {
    andConditions.push({
      variants: {
        some: {
          size: { in: filters.sizes }
        }
      }
    })
  }

  // Stock status filter (OR within this group for multiple statuses)
  if (filters.stockStatus && filters.stockStatus.length > 0) {
    const stockConditions = filters.stockStatus.map(status => {
      switch (status) {
        case 'out':
          // All variants have 0 stock
          return { variants: { every: { stock: 0 } } }
        case 'low':
          // Has variants with stock 1-10
          return { variants: { some: { stock: { gte: 1, lte: 10 } } } }
        case 'normal':
          // Has variants with stock 11-50
          return { variants: { some: { stock: { gte: 11, lte: 50 } } } }
        case 'high':
          // Has variants with stock > 50
          return { variants: { some: { stock: { gt: 50 } } } }
        default:
          return null
      }
    }).filter(Boolean)

    if (stockConditions.length === 1) {
      andConditions.push(stockConditions[0])
    } else if (stockConditions.length > 1) {
      andConditions.push({ OR: stockConditions })
    }
  }

  // Combine all conditions with AND logic
  if (andConditions.length === 0) {
    return where
  } else if (andConditions.length === 1) {
    return andConditions[0]
  } else {
    where.AND = andConditions
    return where
  }
}

/**
 * Build Prisma ORDER BY clause from sort options
 */
function buildOrderByClause(sort: { field: string; direction: 'asc' | 'desc' }): any {
  const { field, direction } = sort

  // Handle nested fields
  if (field === 'category') {
    return { category: { name: direction } }
  }

  // Handle calculated fields (will need to sort in memory)
  if (['totalStock', 'stockValue', 'retailValue'].includes(field)) {
    return { createdAt: 'desc' } // Fallback to created date
  }

  return { [field]: direction }
}

/**
 * Enrich product with calculated fields (Factory Pattern)
 */
function enrichProduct(product: any): any {
  const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
  const stockValue = product.variants.reduce(
    (sum: number, v: any) => sum + (v.price * 0.6 * v.stock), 
    0
  )
  const retailValue = product.variants.reduce(
    (sum: number, v: any) => sum + (v.price * v.stock), 
    0
  )

  let stockStatus: 'out' | 'low' | 'normal' | 'high'
  if (totalStock === 0) stockStatus = 'out'
  else if (totalStock <= 10) stockStatus = 'low'
  else if (totalStock <= 50) stockStatus = 'normal'
  else stockStatus = 'high'

  return {
    ...product,
    category: product.category?.name || 'Uncategorized',
    totalStock,
    stockValue,
    retailValue,
    variantCount: product.variants.length,
    stockStatus
  }
}

