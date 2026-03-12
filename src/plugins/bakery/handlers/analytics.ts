import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

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

      const saleItems = await prisma.saleItem.findMany({
        where: hasDates ? { transaction: { createdAt: dateFilter } } : {},
        select: { productId: true, total: true, quantity: true }
      })
      const revenueMap = new Map<string, { total: number; qty: number }>()
      for (const si of saleItems) {
        const prev = revenueMap.get(si.productId) ?? { total: 0, qty: 0 }
        revenueMap.set(si.productId, { total: prev.total + si.total, qty: prev.qty + si.quantity })
      }

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
        const rev = recipe.outputProductId
          ? (revenueMap.get(recipe.outputProductId) ?? { total: 0, qty: 0 })
          : { total: 0, qty: 0 }
        const wasteCost = wasteMap.get(recipe.id) ?? 0
        const grossProfit = rev.total - batches.totalCost - wasteCost
        const margin = rev.total > 0 ? (grossProfit / rev.total) * 100 : 0
        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          outputProductId: recipe.outputProductId,
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
        include: { recipe: { select: { id: true, name: true, outputProductId: true } } },
        orderBy: { batchDate: 'asc' }
      })

      const saleItems = await prisma.saleItem.findMany({
        where: { transaction: { createdAt: { gte: cutoff } } },
        select: {
          productId: true,
          total: true,
          transaction: { select: { createdAt: true } }
        }
      })

      const getWeek = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7)
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
      }

      const revMap = new Map<string, Map<string, number>>()
      for (const si of saleItems as any[]) {
        const week = getWeek(new Date(si.transaction.createdAt))
        if (!revMap.has(si.productId)) revMap.set(si.productId, new Map())
        const m = revMap.get(si.productId)!
        m.set(week, (m.get(week) ?? 0) + si.total)
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
        select: { id: true, name: true, outputProductId: true }
      })

      return {
        weeks: allWeeks,
        series: (recipes as any[]).map((r: any) => {
          const cMap = costMap.get(r.id) ?? new Map()
          const rMap = r.outputProductId ? (revMap.get(r.outputProductId) ?? new Map()) : new Map()
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
        include: { recipe: { select: { id: true, name: true, outputProductId: true, yieldUnit: true } } },
        orderBy: { batchDate: 'desc' }
      })

      const saleItems = await prisma.saleItem.findMany({
        where: { transaction: { createdAt: { gte: todayStart, lte: todayEnd } } },
        select: { productId: true, quantity: true }
      })
      const soldMap = new Map<string, number>()
      for (const si of saleItems) {
        soldMap.set(si.productId, (soldMap.get(si.productId) ?? 0) + si.quantity)
      }

      const recipeMap = new Map<string, any>()
      for (const batch of batches as any[]) {
        const key = batch.recipeId
        if (!recipeMap.has(key)) {
          recipeMap.set(key, {
            recipeId: batch.recipeId,
            recipeName: batch.recipe.name,
            outputProductId: batch.recipe.outputProductId,
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
        const unitsSold = entry.outputProductId
          ? (soldMap.get(entry.outputProductId) ?? 0)
          : 0
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

      const todaySales = await prisma.saleItem.findMany({
        where: { transaction: { createdAt: { gte: todayStart, lte: todayEnd } } },
        select: { total: true, quantity: true }
      }).catch(() => [] as any[])

      const todayRevenue = (todaySales as any[]).reduce((s: number, si: any) => s + (si.total ?? 0), 0)
      const todayUnitsSold = (todaySales as any[]).reduce((s: number, si: any) => s + (si.quantity ?? 0), 0)

      const capacity = recipes.map((recipe: any) => {
        let availableBatches = Infinity
        let limitedBy: string | null = null

        const ingredientBreakdown = recipe.ingredients.map((ing: any) => {
          const pi = ing.pantryIngredient
          const inStock = pi?.currentStock ?? null
          const needed = ing.quantity
          const canMake = (pi && needed > 0) ? Math.floor(inStock / needed) : null
          const shortfall = (canMake !== null && canMake < 1) ? Math.max(0, needed - inStock) : 0

          if (pi && needed > 0) {
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

      return {
        scheduled, expiringBatches, lowStock, reorderNeeded, capacity,
        todayBatches: (todayBatches as any[]).map((b: any) => ({
          id: b.id,
          recipeName: b.recipe.name,
          yieldUnit: b.recipe.yieldUnit,
          quantityProduced: b.quantityProduced,
          totalCost: b.totalCost
        })),
        todayRevenue,
        todayUnitsSold
      }
    } catch (err) {
      log.error('bakery:getDailyOverview error', err)
      throw err
    }
  })
}
