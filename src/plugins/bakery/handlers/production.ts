import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Production')

export function registerProductionHandlers(prisma: any) {
  ipcMain.handle('bakery:getProductionBatches', async (_e, options: {
    recipeId?: string
    startDate?: string
    endDate?: string
    limit?: number
  } = {}) => {
    try {
      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.startDate || options.endDate) {
        where.batchDate = {}
        if (options.startDate) where.batchDate.gte = new Date(options.startDate)
        if (options.endDate) where.batchDate.lte = new Date(options.endDate)
      }
      return await prisma.productionBatch.findMany({
        where,
        include: {
          recipe: {
            select: { id: true, name: true, yieldQty: true, yieldUnit: true, expiryDays: true }
          }
        },
        orderBy: { batchDate: 'desc' },
        take: options.limit ?? 200
      })
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
        include: { ingredients: true }
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
            if (ing.pantryIngredientId) {
              await tx.pantryIngredient.update({
                where: { id: ing.pantryIngredientId },
                data: { currentStock: { decrement: ing.quantity * data.quantity } }
              })
            }
          }
        }

        if ((recipe as any).outputProductId) {
          await tx.productVariant.updateMany({
            where: { productId: (recipe as any).outputProductId },
            data: { stock: { increment: unitsProduced } }
          })
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
