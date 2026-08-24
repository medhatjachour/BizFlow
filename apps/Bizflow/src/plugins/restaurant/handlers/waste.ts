import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

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
    try {
      let costLoss = Number(data.costLoss || 0)

      // If tied to an ingredient, deduct stock automatically and compute exact cost
      if (data.ingredientId) {
        const ing = await prisma.restaurantIngredient.findUnique({
          where: { id: data.ingredientId }
        })
        if (ing) {
          costLoss = Number(data.quantity) * ing.costPerUnit
          const newStock = Math.max(0, ing.currentStock - Number(data.quantity))

          await prisma.restaurantIngredient.update({
            where: { id: data.ingredientId },
            data: { currentStock: newStock }
          })

          await prisma.ingredientStockMovement.create({
            data: {
              ingredientId: data.ingredientId,
              type: 'waste',
              quantity: -Number(data.quantity),
              unitCost: ing.costPerUnit,
              notes: `Waste reason: ${data.reason}`
            }
          })
        }
      }

      return await prisma.restaurantWasteLog.create({
        data: {
          ingredientId: data.ingredientId || null,
          itemName: data.itemName,
          quantity: Number(data.quantity),
          unit: data.unit || 'pcs',
          costLoss,
          reason: data.reason || 'expired',
          loggedBy: data.loggedBy || 'Staff',
          notes: data.notes || null
        },
        include: { ingredient: true }
      })
    } catch (err) {
      log.error('logWaste error', err)
      throw err
    }
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