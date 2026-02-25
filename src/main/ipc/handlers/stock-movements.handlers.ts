/**
 * Stock Movement IPC Handlers
 * Handles stock adjustments, restocks, and removals
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('StockMovements')

export function registerStockMovementHandlers(prisma: any) {
  /**
   * Record a stock movement (add, set, remove)
   */
  ipcMain.handle('stockMovements:record', async (_, data: {
    variantId: string
    mode: 'add' | 'set' | 'remove'
    value: number
    reason: string
    notes?: string
    userId?: string
  }) => {
    try {
      const { variantId, mode, value, reason, notes, userId } = data

      // Validate input
      if (!variantId || !mode || value <= 0) {
        return { 
          success: false, 
          error: 'Invalid input: variantId, mode, and positive value required' 
        }
      }

      const result = await prisma.$transaction(async (tx: any) => {
        // Get current variant
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { 
            product: { 
              select: { name: true, baseSKU: true } 
            } 
          }
        })

        if (!variant) {
          throw new Error('Variant not found')
        }

        const previousStock = variant.stock

        // Calculate new stock based on mode
        let newStock: number
        let actualChange: number
        let movementType: string

        switch (mode) {
          case 'add':
            newStock = previousStock + value
            actualChange = value
            movementType = reason === 'customer_return' ? 'RETURN' : 'RESTOCK'
            break

          case 'set':
            newStock = value
            actualChange = value - previousStock
            movementType = actualChange >= 0 ? 'ADJUSTMENT' : 'ADJUSTMENT'
            break

          case 'remove':
            newStock = previousStock - value
            actualChange = -value
            movementType = reason === 'damaged' || reason === 'theft' ? 'SHRINKAGE' : 'ADJUSTMENT'
            break

          default:
            throw new Error('Invalid mode')
        }

        // Prevent negative stock
        if (newStock < 0) {
          throw new Error('Stock cannot be negative')
        }

        // Update variant stock
        const updatedVariant = await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: newStock }
        })

        // Record stock movement
        const movement = await tx.stockMovement.create({
          data: {
            variantId,
            type: movementType,
            quantity: actualChange,
            previousStock,
            newStock,
            reason: reason,
            notes: notes || null,
            userId: userId || null
          }
        })

        return {
          variant: updatedVariant,
          movement,
          productName: variant.product.name
        }
      })

      return { 
        success: true, 
        data: result 
      }
    } catch (error: any) {
      log.error('Error recording stock movement:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  /**
   * Get stock movement history for a variant
   */
  ipcMain.handle('stockMovements:getHistory', async (_, data: {
    variantId: string
    limit?: number
  }) => {
    try {
      const { variantId, limit = 50 } = data

      const movements = await prisma.stockMovement.findMany({
        where: { variantId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          variant: {
            select: {
              sku: true,
              color: true,
              size: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return { 
        success: true, 
        movements 
      }
    } catch (error: any) {
      log.error('Error getting stock movement history:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  /**
   * Get stock movement history for a product (all variants)
   */
  ipcMain.handle('stockMovements:getProductHistory', async (_, data: {
    productId: string
    limit?: number
  }) => {
    try {
      const { productId, limit = 100 } = data

      // Get all variant IDs for this product
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        select: { id: true }
      })

      const variantIds = variants.map(v => v.id)

      const movements = await prisma.stockMovement.findMany({
        where: { 
          variantId: { in: variantIds }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          variant: {
            select: {
              sku: true,
              color: true,
              size: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return { 
        success: true, 
        movements 
      }
    } catch (error: any) {
      log.error('Error getting product stock movement history:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  /**
   * Get recent stock movements (all products)
   */
  ipcMain.handle('stockMovements:getRecent', async (_, data: {
    limit?: number
    type?: string
  }) => {
    try {
      const { limit = 50, type } = data

      const where = type ? { type } : {}

      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          variant: {
            select: {
              sku: true,
              color: true,
              size: true,
              stock: true,
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return { 
        success: true, 
        movements 
      }
    } catch (error: any) {
      log.error('Error getting recent stock movements:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  /**
   * Bulk stock adjustment (multiple variants at once)
   */
  ipcMain.handle('stockMovements:bulkRecord', async (_, data: {
    movements: Array<{
      variantId: string
      mode: 'add' | 'set' | 'remove'
      value: number
      reason: string
      notes?: string
    }>
    userId?: string
  }) => {
    try {
      const { movements, userId } = data

      if (!movements || movements.length === 0) {
        return { 
          success: false, 
          error: 'No movements provided' 
        }
      }

      const results = await prisma.$transaction(async (tx: any) => {
        const updatedVariants: any[] = []
        const createdMovements: any[] = []

        for (const movement of movements) {
          const { variantId, mode, value, reason, notes } = movement

          // Get current variant
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId }
          })

          if (!variant) {
            throw new Error(`Variant ${variantId} not found`)
          }

          const previousStock = variant.stock

          // Calculate new stock
          let newStock: number
          let actualChange: number
          let movementType: string

          switch (mode) {
            case 'add':
              newStock = previousStock + value
              actualChange = value
              movementType = 'RESTOCK'
              break
            case 'set':
              newStock = value
              actualChange = value - previousStock
              movementType = 'ADJUSTMENT'
              break
            case 'remove':
              newStock = previousStock - value
              actualChange = -value
              movementType = 'SHRINKAGE'
              break
            default:
              throw new Error('Invalid mode')
          }

          if (newStock < 0) {
            throw new Error(`Stock for variant ${variantId} cannot be negative`)
          }

          // Update variant
          const updated = await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: newStock }
          })
          updatedVariants.push(updated)

          // Record movement
          const stockMovement = await tx.stockMovement.create({
            data: {
              variantId,
              type: movementType,
              quantity: actualChange,
              previousStock,
              newStock,
              reason,
              notes: notes || null,
              userId: userId || null
            }
          })
          createdMovements.push(stockMovement)
        }

        return {
          variants: updatedVariants,
          movements: createdMovements
        }
      })

      return { 
        success: true, 
        data: results 
      }
    } catch (error: any) {
      log.error('Error recording bulk stock movements:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })
}
