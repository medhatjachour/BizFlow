import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertToBaseUnit } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Waste')

export function registerWasteHandlers(prisma: any) {
  ipcMain.handle('restaurant:getWasteLogs', async (_e, options?: { startDate?: string; endDate?: string }) => {
    try {
      const where: any = {}
      if (options?.startDate || options?.endDate) {
        where.createdAt = {}
        if (options.startDate) where.createdAt.gte = new Date(options.startDate)
        if (options.endDate) where.createdAt.lte = new Date(options.endDate)
      }

      return await prisma.restaurantWasteLog.findMany({
        where,
        include: { ingredient: true },
        orderBy: { createdAt: 'desc' }
      })
    } catch (err) {
      log.error('getWasteLogs error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:logWaste', async (_e, data: {
    ingredientId?: string
    itemName: string
    quantity: number
    unit: string
    costLoss?: number
    reason: string
    loggedBy?: string
    notes?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      let costLoss = roundMoney(Number(data.costLoss || 0))

      if (data.ingredientId) {
        const ing = await tx.restaurantIngredient.findUnique({ where: { id: data.ingredientId } })
        if (ing) {
          const { normalizedQty: deductQty } = convertToBaseUnit(Number(data.quantity), data.unit)
          costLoss = roundMoney(deductQty * ing.costPerUnit)
          const newStock = roundMoney(Math.max(0, ing.currentStock - deductQty))

          await tx.restaurantIngredient.update({
            where: { id: data.ingredientId },
            data: { currentStock: newStock }
          })

          await tx.ingredientStockMovement.create({
            data: {
              ingredientId: data.ingredientId,
              type: 'waste',
              quantity: -deductQty,
              unitCost: ing.costPerUnit,
              notes: `Waste: ${data.reason} (${data.notes || 'No notes'})`
            }
          })

          if (newStock <= ing.minStockAlert) {
            broadcastRestaurantEvent('inventory:low_stock', ing)
          }
        }
      }

      return await tx.restaurantWasteLog.create({
        data: {
          ingredientId: data.ingredientId || null,
          itemName: data.itemName,
          quantity: Number(data.quantity),
          unit: data.unit || 'g',
          costLoss,
          reason: data.reason || 'expired',
          loggedBy: data.loggedBy || 'Staff',
          notes: data.notes || null
        },
        include: { ingredient: true }
      })
    })
  })

  ipcMain.handle('restaurant:deleteWasteLog', async (_e, id: string) => {
    try {
      return await prisma.restaurantWasteLog.delete({ where: { id } })
    } catch (err) {
      log.error('deleteWasteLog error', err)
      throw err
    }
  })
}