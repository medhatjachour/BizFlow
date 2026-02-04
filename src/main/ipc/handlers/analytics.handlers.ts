/**
 * Product Analytics & Stock Movement Tracking Handlers
 * 
 * Features:
 * 1. Stock Movement Tracking - Record every inventory change
 * 2. Product Sales Analytics - Units sold, revenue, trends
 * 3. Time-based Analysis - Daily, monthly, yearly charts
 * 4. Stockout History - Track when products run out
 * 5. Store Comparison - Multi-store analytics and comparison
 */

import { ipcMain } from 'electron'
import path from 'node:path'
import { getDatabasePath } from '../../database/init'
import { StoreAnalyticsService } from '../../services/StoreAnalyticsService'

// Initialize Prisma client
function initializePrisma() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const dbPath = getDatabasePath()
    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}?connection_limit=1&timeout=60000&journal_mode=WAL`
        }
      }
    })
  } catch (error) {
    console.error('❌ Failed to initialize Prisma for analytics:', error)
  }
  return null
}

let prisma: any = null

export function registerAnalyticsHandlers() {
  // Initialize Prisma when registering handlers
  prisma = initializePrisma()
  
  if (!prisma) {
    console.warn('⚠️  Analytics handlers registered but Prisma client unavailable')
    return
  }

// ==================== STOCK MOVEMENT TRACKING ====================

/**
 * Record a stock movement (restock, sale, adjustment, etc.)
 */
ipcMain.handle('analytics:recordStockMovement', async (_, data: {
  variantId: string
  type: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
  quantity: number
  reason?: string
  referenceId?: string
  userId?: string
  notes?: string
}) => {
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: { product: true }
    })

    if (!variant) {
      throw new Error('Product variant not found')
    }

    const previousStock = variant.stock
    const newStock = previousStock + data.quantity

    if (newStock < 0) {
      throw new Error('Insufficient stock for this operation')
    }

    // Create stock movement record
    const movement = await prisma.stockMovement.create({
      data: {
        variantId: data.variantId,
        type: data.type,
        quantity: data.quantity,
        previousStock,
        newStock,
        reason: data.reason,
        referenceId: data.referenceId,
        userId: data.userId,
        notes: data.notes
      },
      include: {
        variant: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            username: true,
            fullName: true
          }
        }
      }
    })

    // Update variant stock
    await prisma.productVariant.update({
      where: { id: data.variantId },
      data: {
        stock: newStock,
        lastRestocked: data.type === 'RESTOCK' ? new Date() : undefined
      }
    })

    return movement
  } catch (error) {
    console.error('❌ Error recording stock movement:', error)
    throw error
  }
})

/**
 * Get stock movement history for a variant
 */
ipcMain.handle('analytics:getStockMovementHistory', async (_, variantId: string, options?: {
  limit?: number
  type?: string
  startDate?: string
  endDate?: string
}) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: {
        variantId,
        ...(options?.type && { type: options.type }),
        ...(options?.startDate && options?.endDate && {
          createdAt: {
            gte: new Date(options.startDate),
            lte: new Date(options.endDate)
          }
        })
      },
      include: {
        variant: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options?.limit || 100
    })

    return movements
  } catch (error) {
    console.error('❌ Error fetching movement history:', error)
    throw error
  }
})

/**
 * Get stockout history - times when product ran out and was restocked
 */
ipcMain.handle('analytics:getStockoutHistory', async (_, variantId: string) => {
  try {
    // Find all times this variant went to 0 stock
    const stockouts = await prisma.stockMovement.findMany({
      where: {
        variantId,
        newStock: 0
      },
      include: {
        variant: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // For each stockout, find the next restock
    const stockoutHistory = await Promise.all(
      stockouts.map(async (stockout) => {
        const nextRestock = await prisma.stockMovement.findFirst({
          where: {
            variantId,
            type: 'RESTOCK',
            createdAt: {
              gt: stockout.createdAt
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        const daysOutOfStock = nextRestock 
          ? Math.ceil((nextRestock.createdAt.getTime() - stockout.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          stockoutDate: stockout.createdAt,
          restockDate: nextRestock?.createdAt || null,
          daysOutOfStock,
          restockQuantity: nextRestock?.quantity || null,
          stillOutOfStock: !nextRestock
        }
      })
    )

    const totalStockouts = stockoutHistory.length
    const avgDaysOutOfStock = stockoutHistory
      .filter(s => s.daysOutOfStock !== null)
      .reduce((sum, s) => sum + (s.daysOutOfStock || 0), 0) / 
      (stockoutHistory.filter(s => s.daysOutOfStock !== null).length || 1)

    return {
      totalStockouts,
      avgDaysOutOfStock: Math.round(avgDaysOutOfStock * 10) / 10,
      history: stockoutHistory
    }
  } catch (error) {
    console.error('❌ Error fetching stockout history:', error)
    throw error
  }
})

/**
 * Get restock history
 */
ipcMain.handle('analytics:getRestockHistory', async (_, variantId: string, limit = 50) => {
  try {
    const restocks = await prisma.stockMovement.findMany({
      where: {
        variantId,
        type: 'RESTOCK'
      },
      include: {
        user: {
          select: {
            username: true,
            fullName: true
          }
        },
        variant: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    const totalRestocked = restocks.reduce((sum, r) => sum + r.quantity, 0)
    const avgRestockQuantity = restocks.length > 0 ? totalRestocked / restocks.length : 0

    return {
      totalRestocks: restocks.length,
      totalQuantity: totalRestocked,
      avgQuantity: Math.round(avgRestockQuantity),
      restocks
    }
  } catch (error) {
    console.error('❌ Error fetching restock history:', error)
    throw error
  }
})

// ==================== PRODUCT SALES ANALYTICS ====================

/**
 * Get product sales statistics
 */
ipcMain.handle('analytics:getProductSalesStats', async (_, productId: string, options?: {
  startDate?: string
  endDate?: string
}) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variants: true
      }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const whereClause: any = {
      productId,
      transaction: {
        status: 'completed'
      }
    }

    if (options?.startDate && options?.endDate) {
      whereClause.createdAt = {
        gte: new Date(options.startDate),
        lte: new Date(options.endDate)
      }
    }

    // Get all sale items for this product
    const saleItems = await prisma.saleItem.findMany({
      where: whereClause,
      include: {
        transaction: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const totalUnitsSold = saleItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalRevenue = saleItems.reduce((sum, item) => sum + item.total, 0)
    const totalTransactions = new Set(saleItems.map(item => item.transactionId)).size
    const avgUnitsPerSale = totalTransactions > 0 ? totalUnitsSold / totalTransactions : 0
    const avgRevenuePerSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Calculate current stock across all variants
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)

    return {
      product: {
        id: product.id,
        name: product.name,
        baseSKU: product.baseSKU,
        category: product.category.name
      },
      totalUnitsSold,
      totalRevenue,
      totalTransactions,
      avgUnitsPerSale: Math.round(avgUnitsPerSale * 10) / 10,
      avgRevenuePerSale: Math.round(avgRevenuePerSale * 100) / 100,
      currentStock: totalStock,
      turnoverRate: totalStock > 0 ? (totalUnitsSold / totalStock) : 0
    }
  } catch (error) {
    console.error('❌ Error fetching product sales stats:', error)
    throw error
  }
})

/**
 * Get sales trend over time (for charts) - OPTIMIZED with SQL
 */
ipcMain.handle('analytics:getProductSalesTrend', async (_, productId: string, options: {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate?: string
  endDate?: string
}) => {
  try {
    // Use SQL date formatting for much faster grouping
    // Note: si.createdAt is stored as Unix timestamp in milliseconds
    let dateFormat: string
    switch (options.period) {
      case 'daily':
        dateFormat = "date(si.createdAt / 1000, 'unixepoch')"
        break
      case 'weekly':
        dateFormat = "date(si.createdAt / 1000, 'unixepoch', 'weekday 0', '-7 days')" // Start of week
        break
      case 'monthly':
        dateFormat = "strftime('%Y-%m', si.createdAt / 1000, 'unixepoch')"
        break
      case 'yearly':
        dateFormat = "strftime('%Y', si.createdAt / 1000, 'unixepoch')"
        break
      default:
        dateFormat = "date(si.createdAt / 1000, 'unixepoch')"
    }
    
    let query = `
      SELECT 
        ${dateFormat} as period,
        CAST(SUM(si.quantity) AS INTEGER) as unitsSold,
        ROUND(SUM(si.total), 2) as revenue,
        COUNT(*) as transactions,
        ROUND(CAST(SUM(si.quantity) AS REAL) / COUNT(*), 1) as avgUnitsPerTransaction
      FROM SaleItem si
      JOIN SaleTransaction st ON si.transactionId = st.id
      WHERE si.productId = ? AND st.status = 'completed'
    `
    
    const params: any[] = [productId]
    
    if (options.startDate && options.endDate) {
      // Convert ISO strings to Unix timestamps (milliseconds) for SQLite comparison
      const startTimestamp = new Date(options.startDate).getTime()
      const endTimestamp = new Date(options.endDate).getTime()
      query += ` AND si.createdAt >= ? AND si.createdAt <= ?`
      params.push(startTimestamp, endTimestamp)
    }
    
    query += `
      GROUP BY period
      ORDER BY period ASC
    `
    
    const trend: any[] = await prisma.$queryRawUnsafe(query, ...params)
    
    // Convert BigInt values to regular numbers for JSON serialization
    const serializedTrend = trend.map(t => ({
      ...t,
      unitsSold: Number(t.unitsSold),
      transactions: Number(t.transactions)
    }))
    
    return serializedTrend
  } catch (error) {
    console.error('❌ Error fetching sales trend:', error)
    throw error
  }
})

/**
 * Get top selling products - OPTIMIZED with database aggregation
 */
ipcMain.handle('analytics:getTopSellingProducts', async (_, options: {
  limit?: number
  startDate?: string
  endDate?: string
  categoryId?: string
}) => {
  try {
    const limit = options.limit || 10
    
    // Use raw SQL for much faster aggregation (100x faster than Prisma groupBy)
    let query = `
      SELECT 
        p.id as productId,
        p.name as productName,
        COALESCE(c.name, 'Uncategorized') as category,
        CAST(SUM(si.quantity) AS INTEGER) as unitsSold,
        ROUND(SUM(si.total), 2) as revenue,
        COUNT(DISTINCT si.transactionId) as transactions,
        ROUND(CAST(SUM(si.quantity) AS REAL) / COUNT(DISTINCT si.transactionId), 1) as avgUnitsPerTransaction
      FROM SaleItem si
      JOIN Product p ON si.productId = p.id
      LEFT JOIN Category c ON p.categoryId = c.id
      JOIN SaleTransaction st ON si.transactionId = st.id
      WHERE st.status = 'completed'
    `
    
    const params: any[] = []
    
    if (options.startDate && options.endDate) {
      // Convert ISO strings to Unix timestamps (milliseconds) for SQLite comparison
      const startTimestamp = new Date(options.startDate).getTime()
      const endTimestamp = new Date(options.endDate).getTime()
      query += ` AND si.createdAt >= ? AND si.createdAt <= ?`
      params.push(startTimestamp, endTimestamp)
    }
    
    if (options.categoryId) {
      query += ` AND p.categoryId = ?`
      params.push(options.categoryId)
    }
    
    query += `
      GROUP BY p.id, p.name, c.name
      ORDER BY unitsSold DESC
      LIMIT ?
    `
    params.push(limit)
    
    const topProducts: any[] = await prisma.$queryRawUnsafe(query, ...params)
    
    // Convert BigInt values to regular numbers for JSON serialization
    const serializedProducts = topProducts.map(p => ({
      ...p,
      unitsSold: Number(p.unitsSold),
      transactions: Number(p.transactions)
    }))
    
    return serializedProducts
  } catch (error) {
    console.error('❌ Error fetching top selling products:', error)
    throw error
  }
})

/**
 * Get overall sales statistics for a date range
 */
ipcMain.handle('analytics:getOverallStats', async (_, options: {
  startDate?: string
  endDate?: string
}) => {
  try {
    let query = `
      SELECT 
        CAST(SUM(si.quantity) AS INTEGER) as totalUnitsSold,
        ROUND(SUM(si.total), 2) as totalRevenue,
        COUNT(DISTINCT si.transactionId) as totalTransactions,
        COUNT(DISTINCT si.productId) as uniqueProducts
      FROM SaleItem si
      JOIN SaleTransaction st ON si.transactionId = st.id
      WHERE st.status = 'completed'
    `
    
    const params: any[] = []
    
    if (options.startDate && options.endDate) {
      const startTimestamp = new Date(options.startDate).getTime()
      const endTimestamp = new Date(options.endDate).getTime()
      query += ` AND si.createdAt >= ? AND si.createdAt <= ?`
      params.push(startTimestamp, endTimestamp)
    }
    
    const result: any[] = await prisma.$queryRawUnsafe(query, ...params)
    const stats = result[0]
    
    const finalStats = {
      totalUnitsSold: Number(stats.totalUnitsSold) || 0,
      totalRevenue: Number(stats.totalRevenue) || 0,
      totalTransactions: Number(stats.totalTransactions) || 0,
      uniqueProducts: Number(stats.uniqueProducts) || 0,
      avgOrderValue: stats.totalTransactions > 0 ? Number(stats.totalRevenue) / Number(stats.totalTransactions) : 0
    }
    
    return finalStats
  } catch (error) {
    console.error('❌ Error fetching overall stats:', error)
    throw error
  }
})

/**
 * Get all stock movements across all variants with filters - OPTIMIZED with SQL
 */
ipcMain.handle('analytics:getAllStockMovements', async (_, options?: {
  limit?: number
  type?: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
  startDate?: string
  endDate?: string
  search?: string
}) => {
  try {
    const limit = options?.limit || 50 // Reduced default from 100
    
    // Use raw SQL for much faster querying with joins
    let query = `
      SELECT 
        sm.id,
        sm.type,
        sm.quantity,
        sm.previousStock,
        sm.newStock,
        sm.reason,
        sm.notes,
        sm.createdAt,
        p.name as productName,
        COALESCE(v.sku, p.baseSKU) as productSku,
        u.username,
        u.fullName
      FROM StockMovement sm
      JOIN ProductVariant v ON sm.variantId = v.id
      JOIN Product p ON v.productId = p.id
      LEFT JOIN User u ON sm.userId = u.id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (options?.type) {
      query += ` AND sm.type = ?`
      params.push(options.type)
    }
    
    if (options?.startDate) {
      query += ` AND sm.createdAt >= ?`
      params.push(new Date(options.startDate).toISOString())
    }
    
    if (options?.endDate) {
      query += ` AND sm.createdAt <= ?`
      params.push(new Date(options.endDate).toISOString())
    }
    
    if (options?.search) {
      query += ` AND (p.name LIKE ? OR v.sku LIKE ? OR p.baseSKU LIKE ?)`
      const searchTerm = `%${options.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }
    
    query += `
      ORDER BY sm.createdAt DESC
      LIMIT ?
    `
    params.push(limit)
    
    const movements: any[] = await prisma.$queryRawUnsafe(query, ...params)
    
    // Format response
    return movements.map(m => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: m.reason,
      notes: m.notes,
      createdAt: m.createdAt,
      product: {
        name: m.productName,
        sku: m.productSku
      },
      user: m.username ? {
        username: m.username,
        fullName: m.fullName
      } : null
    }))
  } catch (error) {
    console.error('❌ Error fetching all stock movements:', error)
    throw error
  }
})

// ============================================================================
// STORE ANALYTICS & COMPARISON HANDLERS
// ============================================================================

/**
 * Compare multiple stores - SQL-optimized
 * Returns revenue, profit, transactions, inventory metrics per store
 */
ipcMain.handle('analytics:compareStores', async (_, options: {
  storeIds?: string[]
  startDate?: string
  endDate?: string
}) => {
  try {
    if (!prisma) {
      console.error('❌ Prisma not initialized for store comparison')
      return { stores: [], dateRange: { startDate: new Date(), endDate: new Date() } }
    }

    const storeAnalytics = StoreAnalyticsService.getInstance(prisma)
    const { storeIds = [], startDate, endDate } = options

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const comparison = await storeAnalytics.compareStores(storeIds, start, end)
    
    return comparison
  } catch (error) {
    console.error('❌ Error comparing stores:', error)
    throw error
  }
})

/**
 * Get metrics for a single store
 */
ipcMain.handle('analytics:getStoreMetrics', async (_, options: {
  storeId: string
  storeName: string
  startDate?: string
  endDate?: string
}) => {
  try {
    if (!prisma) {
      console.error('❌ Prisma not initialized for store metrics')
      return null
    }

    const storeAnalytics = StoreAnalyticsService.getInstance(prisma)
    const { storeId, storeName, startDate, endDate } = options

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const metrics = await storeAnalytics.getStoreMetrics(storeId, storeName, start, end)
    
    return metrics
  } catch (error) {
    console.error('❌ Error getting store metrics:', error)
    throw error
  }
})

/**
 * Get top performing stores
 */
ipcMain.handle('analytics:getTopStores', async (_, options: {
  limit?: number
  startDate?: string
  endDate?: string
}) => {
  try {
    if (!prisma) {
      console.error('❌ Prisma not initialized for top stores')
      return []
    }

    const storeAnalytics = StoreAnalyticsService.getInstance(prisma)
    const { limit = 10, startDate, endDate } = options

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const topStores = await storeAnalytics.getTopStores(limit, start, end)
    
    return topStores
  } catch (error) {
    console.error('❌ Error getting top stores:', error)
    throw error
  }
})

/**
 * Get store performance trends over time
 */
ipcMain.handle('analytics:getStoreTrends', async (_, options: {
  storeId: string
  interval?: 'day' | 'week' | 'month'
  days?: number
}) => {
  try {
    if (!prisma) {
      console.error('❌ Prisma not initialized for store trends')
      return []
    }

    const storeAnalytics = StoreAnalyticsService.getInstance(prisma)
    const { storeId, interval = 'day', days = 30 } = options

    const trends = await storeAnalytics.getStoreTrends(storeId, interval, days)
    
    return trends
  } catch (error) {
    console.error('❌ Error getting store trends:', error)
    throw error
  }
})

}
