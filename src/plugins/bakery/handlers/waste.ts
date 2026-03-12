import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Waste')

export function registerWasteHandlers(prisma: any) {
  ipcMain.handle('bakery:getWasteLogs', async (_e, options: {
    recipeId?: string
    wasteType?: string
    startDate?: string
    endDate?: string
    limit?: number
  } = {}) => {
    try {
      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.wasteType) where.wasteType = options.wasteType
      if (options.startDate || options.endDate) {
        where.wasteDate = {}
        if (options.startDate) where.wasteDate.gte = new Date(options.startDate)
        if (options.endDate) where.wasteDate.lte = new Date(options.endDate)
      }
      return await prisma.wasteLog.findMany({
        where,
        include: {
          recipe: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
          pantryIngredient: { select: { id: true, name: true, unit: true } }
        },
        orderBy: { wasteDate: 'desc' },
        take: options.limit ?? 200
      })
    } catch (err) {
      log.error('bakery:getWasteLogs error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:createWasteLog', async (_e, data: {
    wasteType: string
    recipeId?: string
    productId?: string
    pantryIngredientId?: string
    productionBatchId?: string
    itemName: string
    quantity: number
    unit: string
    cost: number
    reason?: string
    wasteDate?: string
    notes?: string
  }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const wasteLog = await tx.wasteLog.create({
          data: {
            wasteType: data.wasteType ?? 'other',
            recipeId: data.recipeId ?? null,
            productId: data.productId ?? null,
            pantryIngredientId: data.pantryIngredientId ?? null,
            productionBatchId: data.productionBatchId ?? null,
            itemName: data.itemName,
            quantity: data.quantity,
            unit: data.unit,
            cost: data.cost,
            reason: data.reason ?? null,
            wasteDate: data.wasteDate ? new Date(data.wasteDate) : new Date(),
            notes: data.notes ?? null
          },
          include: {
            recipe: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } },
            pantryIngredient: { select: { id: true, name: true, unit: true } }
          }
        })

        if (data.wasteType === 'ingredient' && data.pantryIngredientId) {
          await tx.pantryIngredient.update({
            where: { id: data.pantryIngredientId },
            data: { currentStock: { decrement: data.quantity } }
          })
        } else if (data.wasteType === 'finished_product' && data.productId) {
          await tx.productVariant.updateMany({
            where: { productId: data.productId },
            data: { stock: { decrement: data.quantity } }
          })
        }

        return wasteLog
      })
    } catch (err) {
      log.error('bakery:createWasteLog error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:deleteWasteLog', async (_e, id: string) => {
    try {
      return await prisma.wasteLog.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteWasteLog error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:getWasteSummary', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const where: any = {}
      if (options.startDate || options.endDate) {
        where.wasteDate = {}
        if (options.startDate) where.wasteDate.gte = new Date(options.startDate)
        if (options.endDate) where.wasteDate.lte = new Date(options.endDate)
      }
      const [totalResult, byReason, byRecipe, byWasteType] = await Promise.all([
        prisma.wasteLog.aggregate({ where, _sum: { cost: true, quantity: true }, _count: true }),
        prisma.wasteLog.groupBy({ by: ['reason'], where, _sum: { cost: true, quantity: true }, _count: true, orderBy: { _sum: { cost: 'desc' } } }),
        prisma.wasteLog.groupBy({ by: ['recipeId'], where, _sum: { cost: true }, _count: true }),
        prisma.wasteLog.groupBy({ by: ['wasteType'], where, _sum: { cost: true, quantity: true }, _count: true, orderBy: { _sum: { cost: 'desc' } } })
      ])
      return {
        totalCost: totalResult._sum.cost ?? 0,
        totalQuantity: totalResult._sum.quantity ?? 0,
        totalEntries: totalResult._count,
        byReason,
        byRecipe,
        byWasteType
      }
    } catch (err) {
      log.error('bakery:getWasteSummary error', err)
      throw err
    }
  })
}
