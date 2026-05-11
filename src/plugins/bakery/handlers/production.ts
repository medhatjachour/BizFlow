import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { convertQuantity } from '../utils/unitConversion'

const log = createLogger('Bakery:Production')

export function registerProductionHandlers(prisma: any) {
  ipcMain.handle('bakery:getProductionBatches', async (_e, options: {
    recipeId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  } = {}) => {
    try {
      const page     = Math.max(1, options.page ?? 1)
      const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20))
      const skip     = (page - 1) * pageSize

      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.startDate || options.endDate) {
        where.batchDate = {}
        if (options.startDate) where.batchDate.gte = new Date(options.startDate)
        if (options.endDate) where.batchDate.lte = new Date(options.endDate)
      }

      const [data, total] = await Promise.all([
        prisma.productionBatch.findMany({
          where,
          include: {
            recipe: {
              select: { id: true, name: true, yieldQty: true, yieldUnit: true, expiryDays: true, sellingPrice: true }
            },
            sales:     { select: { id: true, quantity: true } },
            wasteLogs: { select: { id: true, quantity: true, reason: true } }
          },
          orderBy: { batchDate: 'desc' },
          skip,
          take: pageSize
        }),
        prisma.productionBatch.count({ where })
      ])

      // Annotate each batch with unitsSold + unitsLost + unitsAvailable
      const enriched = data.map((b: any) => {
        const unitsSold = b.sales.reduce((s: number, sale: any) => s + sale.quantity, 0)
        const unitsLost = b.wasteLogs.reduce((s: number, w: any) => s + w.quantity, 0)
        return {
          ...b,
          unitsSold,
          unitsLost,
          unitsAvailable: Math.max(0, b.unitsProduced - unitsSold - unitsLost)
        }
      })

      return { data: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('bakery:getProductionBatches error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:createProductionBatch', async (_e, data: {
    recipeId: string
    quantity: number
    batchDate?: string
    notes?: string
    deductFromPantry?: boolean
  }) => {
    try {
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
        include: {
          ingredients: {
            include: { pantryIngredient: { select: { id: true, unit: true } } }
          }
        }
      })
      if (!recipe) throw new Error('Recipe not found')

      const ingredientCostPerBatch = recipe.ingredients.reduce(
        (sum: number, ing: any) => sum + ing.quantity * ing.costPerUnit, 0
      )
      const unitsProduced = data.quantity * recipe.yieldQty
      const totalCost = ingredientCostPerBatch * data.quantity
      const batchDate = data.batchDate ? new Date(data.batchDate) : new Date()
      const expiresAt = recipe.expiryDays
        ? new Date(batchDate.getTime() + recipe.expiryDays * 86400000)
        : null

      return await prisma.$transaction(async (tx: any) => {
        if (data.deductFromPantry !== false) {
          for (const ing of recipe.ingredients) {
            if (ing.pantryIngredientId && ing.pantryIngredient) {
              const pantryUnit = ing.pantryIngredient.unit
              // Convert recipe quantity to pantry's unit before deducting
              const deductQty = convertQuantity(ing.quantity * data.quantity, ing.unit, pantryUnit)
                ?? (ing.quantity * data.quantity) // fallback: same unit assumed
              await tx.pantryIngredient.update({
                where: { id: ing.pantryIngredientId },
                data: { currentStock: { decrement: deductQty } }
              })
            }
          }
        }

        return tx.productionBatch.create({
          data: {
            recipeId: data.recipeId,
            quantity: data.quantity,
            unitsProduced,
            totalCost,
            batchDate,
            expiresAt,
            notes: data.notes
          },
          include: {
            recipe: { select: { id: true, name: true, yieldUnit: true, expiryDays: true } }
          }
        })
      })
    } catch (err) {
      log.error('bakery:createProductionBatch error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:deleteProductionBatch', async (_e, id: string) => {
    try {
      return await prisma.productionBatch.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteProductionBatch error', err)
      throw err
    }
  })

  /**
   * Get production batches that still have units available to sell.
   * Returns batches sorted by expiry (FIFO), excluding expired ones.
   */
  ipcMain.handle('bakery:getSellableBatches', async () => {
    try {
      const batches = await prisma.productionBatch.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          recipe: {
            select: { id: true, name: true, yieldQty: true, yieldUnit: true, sellingPrice: true, expiryDays: true }
          },
          sales: { select: { quantity: true } }
        },
        orderBy: [
          { expiresAt: 'asc' },
          { batchDate: 'asc' }
        ],
        take: 200
      })

      return batches
        .map((b: any) => ({
          ...b,
          unitsSold:      b.sales.reduce((s: number, sale: any) => s + sale.quantity, 0),
          unitsAvailable: Math.max(0, b.unitsProduced - b.sales.reduce((s: number, sale: any) => s + sale.quantity, 0))
        }))
        .filter((b: any) => b.unitsAvailable > 0)
    } catch (err) {
      log.error('bakery:getSellableBatches error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:getAvailableBatches', async () => {
    try {
      const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        include: {
          ingredients: {
            include: {
              pantryIngredient: {
                select: { id: true, name: true, currentStock: true, unit: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      return recipes.map((recipe: any) => {
        let availableBatches = Infinity
        let limitedBy: string | null = null

        for (const ing of recipe.ingredients) {
          if (!ing.pantryIngredient || ing.quantity <= 0) continue
          const possible = Math.floor(ing.pantryIngredient.currentStock / ing.quantity)
          if (possible < availableBatches) {
            availableBatches = possible
            limitedBy = ing.pantryIngredient.name
          }
        }

        const hasLinked = recipe.ingredients.some((i: any) => i.pantryIngredient)
        const finalBatches = hasLinked ? (isFinite(availableBatches) ? availableBatches : 0) : null

        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          yieldQty: recipe.yieldQty,
          yieldUnit: recipe.yieldUnit,
          availableBatches: finalBatches,
          expectedUnits: finalBatches !== null ? finalBatches * recipe.yieldQty : null,
          limitedBy,
          ingredients: recipe.ingredients.map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            pantryStock: ing.pantryIngredient?.currentStock ?? null,
            pantryUnit: ing.pantryIngredient?.unit ?? null,
            maxBatches: ing.pantryIngredient && ing.quantity > 0
              ? Math.floor(ing.pantryIngredient.currentStock / ing.quantity)
              : null
          }))
        }
      })
    } catch (err) {
      log.error('bakery:getAvailableBatches error', err)
      throw err
    }
  })
}
