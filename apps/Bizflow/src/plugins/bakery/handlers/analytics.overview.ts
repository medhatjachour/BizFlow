/**
 * Bakery daily overview analytics (today's schedule, capacity, stock & sales).
 *   bakery:getDailyOverview
 * Split out of analytics.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { convertQuantity } from '../utils/unitConversion'

const log = createLogger('Bakery:Analytics')

export function registerBakeryOverviewHandlers(prisma: any) {
  ipcMain.handle('bakery:getDailyOverview', async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(todayStart.getTime() + 86400000 - 1)
      const twoDaysOut = new Date(todayStart.getTime() + 2 * 86400000)

      const [scheduled, expiringBatches, lowStockItems] = await Promise.all([
        prisma.productionSchedule.findMany({
          where: { scheduledDate: { gte: todayStart, lte: todayEnd } },
          include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } },
          orderBy: { scheduledDate: 'asc' }
        }),
        prisma.productionBatch.findMany({
          where: { expiresAt: { gte: now, lte: twoDaysOut } },
          include: { recipe: { select: { id: true, name: true } } },
          orderBy: { expiresAt: 'asc' }
        }),
        prisma.pantryIngredient.findMany({
          where: {
            OR: [
              { currentStock: { lte: prisma.pantryIngredient.fields.lowStockThreshold } }
            ]
          }
        }).catch(() => prisma.pantryIngredient.findMany())
      ])

      const lowStock = (lowStockItems as any[]).filter(
        (p: any) => p.lowStockThreshold > 0 && p.currentStock <= p.lowStockThreshold
      )
      const reorderNeeded = (lowStockItems as any[]).filter(
        (p: any) => p.reorderPoint != null && p.currentStock <= p.reorderPoint
      )

      const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        include: {
          ingredients: {
            include: {
              pantryIngredient: { select: { id: true, name: true, currentStock: true, unit: true } }
            }
          }
        }
      })

      const todayBatches = await prisma.productionBatch.findMany({
        where: { batchDate: { gte: todayStart, lte: todayEnd } },
        include: { recipe: { select: { name: true, yieldUnit: true } } }
      })

      const todaySales = await prisma.bakerySale.aggregate({
        where: { saleDate: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmount: true, quantity: true }
      }).catch(() => ({ _sum: { totalAmount: 0, quantity: 0 } }))

      const todayRevenue = (todaySales as any)._sum?.totalAmount ?? 0
      const todayUnitsSold = (todaySales as any)._sum?.quantity ?? 0

      const capacity = recipes.map((recipe: any) => {
        let availableBatches = Infinity
        let limitedBy: string | null = null

        const ingredientBreakdown = recipe.ingredients.map((ing: any) => {
          const pi = ing.pantryIngredient
          const inStock = pi?.currentStock ?? null
          const needed = ing.quantity
          // Convert pantry stock to the recipe ingredient's unit before comparing
          const inStockInRecipeUnit = (pi && inStock !== null && pi.unit !== ing.unit)
            ? (convertQuantity(inStock, pi.unit, ing.unit) ?? inStock)
            : inStock
          const canMake = (pi && needed > 0 && inStockInRecipeUnit !== null) ? Math.floor(inStockInRecipeUnit / needed) : null
          const shortfall = (canMake !== null && canMake < 1) ? Math.max(0, needed - (inStockInRecipeUnit ?? 0)) : 0

        if (pi && needed > 0 && inStockInRecipeUnit !== null) {
            if (canMake! < availableBatches) {
              availableBatches = canMake!
              limitedBy = pi.name
            }
          }
          return {
            name: pi?.name ?? ing.name ?? 'Unknown',
            unit: pi?.unit ?? '',
            neededPerBatch: needed,
            inStock,
            canMakeBatches: canMake,
            shortfall,
            linked: !!pi
          }
        })

        const hasLinked = recipe.ingredients.some((i: any) => i.pantryIngredient)
        const finalBatches = hasLinked ? (isFinite(availableBatches) ? availableBatches : 0) : null
        const expectedUnits = finalBatches !== null ? Math.round(finalBatches * (recipe.yieldQty ?? 1)) : null

        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          yieldQty: recipe.yieldQty ?? 1,
          yieldUnit: recipe.yieldUnit ?? '',
          availableBatches: finalBatches,
          expectedUnits,
          limitedBy,
          ingredientBreakdown
        }
      })

      const todayProductionCost = (todayBatches as any[]).reduce((s: number, b: any) => s + (b.totalCost ?? 0), 0)

      return {
        scheduled, expiringBatches, lowStock, reorderNeeded, capacity,
        todayBatches: (todayBatches as any[]).map((b: any) => ({
          id: b.id,
          recipeName: b.recipe.name,
          yieldUnit: b.recipe.yieldUnit,
          quantityProduced: b.unitsProduced,
          totalCost: b.totalCost
        })),
        todayRevenue,
        todayUnitsSold,
        todayProductionCost
      }
    } catch (err) {
      log.error('bakery:getDailyOverview error', err)
      throw err
    }
  })
}
