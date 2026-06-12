/**
 * Sales IPC Handlers (Legacy - mostly deprecated)
 * Most sales now handled via SaleTransaction system
 * These handlers kept for backward compatibility only
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Sales')

export function registerSalesHandlers(prisma: any) {
  // Legacy handler - use sale-transactions:create instead
  ipcMain.handle('sales:create', async (_, saleData) => {
    try {
      log.warn('sales:create is deprecated - use sale-transactions:create instead')
      const { productId, variantId, userId, quantity, price, total, paymentMethod } = saleData
      
      if (prisma) {
        // Redirect to new SaleTransaction system
        const result = await prisma.$transaction(async (tx: any) => {
          // Create sale transaction
          const transaction = await tx.saleTransaction.create({
            data: {
              userId,
              customerId: null,
              subtotal: price * quantity,
              tax: 0,
              discount: 0,
              total,
              paymentMethod,
              status: 'completed'
            }
          })
          
          // Create sale item
          await tx.saleItem.create({
            data: {
              transactionId: transaction.id,
              productId,
              variantId,
              quantity,
              price,
              cost: 0,
              total
            }
          })
          
          // Decrease stock
          if (variantId) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: { stock: { decrement: quantity } }
            })
          }
          
          return transaction
        }, {
          maxWait: 30000,
          timeout: 30000
        })
        
        return { success: true, sale: result }
      }
      
      // Mock fallback
      return { success: true, sale: { id: 's_mock', ...saleData, status: 'completed' } }
    } catch (error) {
      log.error('Error creating sale:', error)
      throw error
    }
  })

  ipcMain.handle('sales:getAll', async () => {
    try {
      log.warn('sales:getAll is deprecated - use sale-transactions:getAll instead')
      if (prisma) {
        const transactions = await prisma.saleTransaction.findMany({
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              }
            },
            user: {
              select: {
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        return transactions
      }
      return []
    } catch (error) {
      log.error('Error fetching sales:', error)
      throw error
    }
  })

  /**
   * Get sales by date range - OPTIMIZED for dashboard
   * Only loads sales within specified date range
   */
  ipcMain.handle('sales:getByDateRange', async (_, options = {}) => {
    try {
      log.warn('sales:getByDateRange is deprecated - use sale-transactions:getByDateRange instead')
      const { startDate, endDate } = options
      
      if (!prisma) return []

      const where: any = {}
      
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const transactions = await prisma.saleTransaction.findMany({
        where,
        select: {
          id: true,
          total: true,
          createdAt: true,
          paymentMethod: true,
          status: true,
          customer: {
            select: {
              name: true
            }
          },
          items: {
            select: {
              quantity: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return transactions
    } catch (error) {
      log.error('Error fetching sales by date range:', error)
      throw error
    }
  })

  /**
   * Get sales statistics - OPTIMIZED with raw SQL
   */
  ipcMain.handle('sales:getStats', async (_, options = {}) => {
    try {
      log.warn('sales:getStats is deprecated - use analytics:getOverallStats instead')
      if (!prisma) return null

      const { startDate, endDate } = options
      const where: any = {}
      
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }

      const [totalSales, completedSales, refundedSales] = await Promise.all([
        prisma.saleTransaction.count({ where }),
        prisma.saleTransaction.count({ where: { ...where, status: 'completed' } }),
        prisma.saleTransaction.count({ where: { ...where, status: 'refunded' } })
      ])

      // Get revenue using aggregation
      const revenue = await prisma.saleTransaction.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { total: true }
      })

      return {
        totalSales,
        completedSales,
        refundedSales,
        totalRevenue: revenue._sum.total || 0
      }
    } catch (error) {
      log.error('Error fetching sales stats:', error)
      throw error
    }
  })

  ipcMain.handle('sales:refund', async (_, saleId) => {
    try {
      log.warn('sales:refund is deprecated - use sale-transactions:refund instead')
      if (prisma) {
        const transaction = await prisma.saleTransaction.update({
          where: { id: saleId },
          data: { status: 'refunded' },
          include: {
            items: {
              include: {
                product: true,
                variant: true
              }
            },
            user: {
              select: {
                username: true
              }
            }
          }
        })

        // Restore stock and record stock movement for each item
        for (const item of transaction.items) {
          if (item.variantId) {
            // Get current stock before update
            const variant = await prisma.productVariant.findUnique({
              where: { id: item.variantId }
            })
            
            if (variant) {
              const previousStock = variant.stock
              const newStock = previousStock + item.quantity
              
              // Update stock
              await prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stock: newStock }
              })
              
              // Record stock movement as RETURN
              await prisma.stockMovement.create({
                data: {
                  variantId: item.variantId,
                  type: 'RETURN',
                  quantity: item.quantity, // Positive for returns
                  previousStock,
                  newStock,
                  referenceId: saleId,
                  userId: transaction.userId,
                  reason: 'Refund/Return',
                  notes: `Refund of sale ${saleId}`
                }
              })
            }
          }
        }

        return { success: true, transaction }
      }
      return { success: false, message: 'Database not available' }
    } catch (error) {
      log.error('Error refunding sale:', error)
      throw error
    }
  })
}
