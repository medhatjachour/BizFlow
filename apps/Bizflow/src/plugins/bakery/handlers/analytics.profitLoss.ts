/**
 * Bakery profit & loss analytics.
 *   bakery:getProfitLoss / getProfitLossTrend
 * Split out of analytics.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Analytics')

export function registerBakeryProfitLossHandlers(prisma: any) {
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
}
