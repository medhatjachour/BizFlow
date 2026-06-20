/**
 * Bakery production planning analytics.
 *   bakery:getExpiringBatches / getProductionRequirements / getEndOfDaySuggestion
 * Split out of analytics.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Analytics')

export function registerBakeryProductionHandlers(prisma: any) {
  ipcMain.handle('bakery:getExpiringBatches', async (_e, daysAhead = 7) => {
    try {
      const cutoff = new Date(Date.now() + daysAhead * 86400000)
      return await prisma.productionBatch.findMany({
        where: { expiresAt: { not: null, lte: cutoff } },
        include: { recipe: { select: { id: true, name: true } } },
        orderBy: { expiresAt: 'asc' }
      })
    } catch (err) {
      log.error('bakery:getExpiringBatches error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:getProductionRequirements', async (_e, data: {
    recipeId: string
    quantity: number
  }) => {
    try {
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
        include: {
          ingredients: {
            include: {
              pantryIngredient: {
                select: { id: true, name: true, currentStock: true, unit: true, lowStockThreshold: true }
              }
            }
          }
        }
      })
      if (!recipe) throw new Error('Recipe not found')

      const requirements = (recipe.ingredients as any[]).map((ing: any) => {
        const needed = ing.quantity * data.quantity
        const stock = ing.pantryIngredient?.currentStock ?? null
        const remaining = stock !== null ? stock - needed : null
        const status =
          !ing.pantryIngredient ? 'unlinked' :
          remaining !== null && remaining < 0 ? 'empty' :
          remaining !== null && ing.pantryIngredient.lowStockThreshold > 0 &&
          remaining <= ing.pantryIngredient.lowStockThreshold ? 'low' : 'ok'
        return {
          ingredientId: ing.id,
          name: ing.name,
          needed,
          unit: ing.unit,
          currentStock: stock,
          remaining,
          status,
          pantryLinked: !!ing.pantryIngredient
        }
      })
      return { requirements, recipeName: (recipe as any).name }
    } catch (err) {
      log.error('bakery:getProductionRequirements error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:getEndOfDaySuggestion', async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(todayStart.getTime() + 86400000 - 1)

      const batches = await prisma.productionBatch.findMany({
        where: { batchDate: { gte: todayStart, lte: todayEnd } },
        include: { recipe: { select: { id: true, name: true, yieldUnit: true } } },
        orderBy: { batchDate: 'desc' }
      })

      const todaySalesEod = await prisma.bakerySale.groupBy({
        by: ['recipeId'],
        _sum: { quantity: true },
        where: { saleDate: { gte: todayStart, lte: todayEnd } }
      })
      const soldMap = new Map<string, number>(
        (todaySalesEod as any[]).map((s: any) => [s.recipeId ?? '__none__', s._sum.quantity ?? 0])
      )

      const recipeMap = new Map<string, any>()
      for (const batch of batches as any[]) {
        const key = batch.recipeId
        if (!recipeMap.has(key)) {
          recipeMap.set(key, {
            recipeId: batch.recipeId,
            recipeName: batch.recipe.name,
            yieldUnit: batch.recipe.yieldUnit,
            unitsProduced: 0,
            batches: []
          })
        }
        const entry = recipeMap.get(key)
        entry.unitsProduced += batch.unitsProduced
        entry.batches.push(batch.id)
      }

      return Array.from(recipeMap.values()).map((entry: any) => {
        const unitsSold = soldMap.get(entry.recipeId) ?? 0
        const estimatedWaste = Math.max(0, entry.unitsProduced - unitsSold)
        return { ...entry, unitsSold, estimatedWaste }
      })
    } catch (err) {
      log.error('bakery:getEndOfDaySuggestion error', err)
      throw err
    }
  })
}
