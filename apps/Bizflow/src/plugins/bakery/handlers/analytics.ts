import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { convertQuantity } from '../utils/unitConversion'

const log = createLogger('Bakery:Analytics')

export function registerAnalyticsHandlers(prisma: any) {
  ipcMain.handle('bakery:getProfitLoss', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const dateFilter: any = {}
      if (options.startDate) dateFilter.gte = new Date(options.startDate)
      if (options.endDate) dateFilter.lte = new Date(options.endDate)
      const hasDates = options.startDate || options.endDate

      const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        include: { ingredients: true }
      })

      const batchCostGrouped = await prisma.productionBatch.groupBy({
        by: ['recipeId'],
        _sum: { totalCost: true, unitsProduced: true },
        where: hasDates ? { batchDate: dateFilter } : {}
      })
      const batchCostMap = new Map<string, { totalCost: number; unitsProduced: number }>(
        batchCostGrouped.map((r: any) => [
          r.recipeId,
          { totalCost: r._sum.totalCost ?? 0, unitsProduced: r._sum.unitsProduced ?? 0 }
        ])
      )

      const bakerySales = await prisma.bakerySale.groupBy({
        by: ['recipeId'],
        _sum: { totalAmount: true, quantity: true },
        where: hasDates ? { saleDate: dateFilter } : {}
      })
      const revenueMap = new Map<string, { total: number; qty: number }>(
        bakerySales.map((s: any) => [
          s.recipeId ?? '__none__',
          { total: s._sum.totalAmount ?? 0, qty: s._sum.quantity ?? 0 }
        ])
      )

      const wasteLogs = await prisma.wasteLog.groupBy({
        by: ['recipeId'],
        _sum: { cost: true },
        where: hasDates ? { wasteDate: dateFilter } : {}
      })
      const wasteMap = new Map<string, number>(
        wasteLogs.map((w: any) => [w.recipeId ?? '__none__', w._sum.cost ?? 0])
      )
      const totalWasteCost = wasteLogs.reduce((s: number, w: any) => s + (w._sum.cost ?? 0), 0)

      const rows = recipes.map((recipe: any) => {
        const costPerBatch = recipe.ingredients.reduce(
          (s: number, ing: any) => s + ing.quantity * ing.costPerUnit, 0
        )
        const batches = batchCostMap.get(recipe.id) ?? { totalCost: 0, unitsProduced: 0 }
        const rev = revenueMap.get(recipe.id) ?? { total: 0, qty: 0 }
        const wasteCost = wasteMap.get(recipe.id) ?? 0
        const grossProfit = rev.total - batches.totalCost - wasteCost
        const margin = rev.total > 0 ? (grossProfit / rev.total) * 100 : 0
        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          costPerBatch,
          totalProductionCost: batches.totalCost,
          unitsProduced: batches.unitsProduced,
          totalRevenue: rev.total,
          unitsSold: rev.qty,
          wasteCost,
          grossProfit,
          marginPercent: Math.round(margin * 100) / 100
        }
      })

      const totals = rows.reduce(
        (acc: any, r: any) => ({
          totalProductionCost: acc.totalProductionCost + r.totalProductionCost,
          totalRevenue: acc.totalRevenue + r.totalRevenue,
          wasteCost: acc.wasteCost + r.wasteCost,
          grossProfit: acc.grossProfit + r.grossProfit
        }),
        { totalProductionCost: 0, totalRevenue: 0, wasteCost: 0, grossProfit: 0 }
      )

      return { rows, totals: { ...totals, totalWasteCost } }
    } catch (err) {
      log.error('bakery:getProfitLoss error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:getProfitLossTrend', async (_e, options: {
    weeks?: number
  } = {}) => {
    try {
      const weeks = Math.min(options.weeks ?? 8, 24)
      const cutoff = new Date(Date.now() - weeks * 7 * 86400000)

      const batches = await prisma.productionBatch.findMany({
        where: { batchDate: { gte: cutoff } },
        include: { recipe: { select: { id: true, name: true } } },
        orderBy: { batchDate: 'asc' }
      })

      const bakerySales = await prisma.bakerySale.findMany({
        where: { saleDate: { gte: cutoff } },
        select: { recipeId: true, totalAmount: true, saleDate: true }
      })

      const getWeek = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7)
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
      }

      const revMap = new Map<string, Map<string, number>>()
      for (const si of bakerySales as any[]) {
        const week = getWeek(new Date(si.saleDate))
        const key = si.recipeId ?? '__none__'
        if (!revMap.has(key)) revMap.set(key, new Map())
        const m = revMap.get(key)!
        m.set(week, (m.get(week) ?? 0) + si.totalAmount)
      }

      const costMap = new Map<string, Map<string, number>>()
      for (const batch of batches as any[]) {
        const week = getWeek(new Date(batch.batchDate))
        if (!costMap.has(batch.recipeId)) costMap.set(batch.recipeId, new Map())
        const m = costMap.get(batch.recipeId)!
        m.set(week, (m.get(week) ?? 0) + batch.totalCost)
      }

      const allWeeks = Array.from(new Set([
        ...Array.from(revMap.values()).flatMap(m => Array.from(m.keys())),
        ...Array.from(costMap.values()).flatMap(m => Array.from(m.keys()))
      ])).sort()

      const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      })

      return {
        weeks: allWeeks,
        series: (recipes as any[]).map((r: any) => {
          const cMap = costMap.get(r.id) ?? new Map()
          const rMap = revMap.get(r.id) ?? new Map()
          return {
            recipeId: r.id,
            recipeName: r.name,
            data: allWeeks.map(w => {
              const cost = cMap.get(w) ?? 0
              const rev  = rMap.get(w) ?? 0
              return { week: w, cost, revenue: rev, profit: rev - cost }
            })
          }
        }).filter((s: any) => s.data.some((d: any) => d.cost > 0 || d.revenue > 0))
      }
    } catch (err) {
      log.error('bakery:getProfitLossTrend error', err)
      throw err
    }
  })

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
