import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Sales')

export function registerSalesHandlers(prisma: any) {
  /**
   * Get paginated bakery sales with optional filters.
   * Returns { data, total, page, pageSize, totalPages }
   */
  ipcMain.handle('bakery:getSales', async (_e, options: {
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
        where.saleDate = {}
        if (options.startDate) where.saleDate.gte = new Date(options.startDate)
        if (options.endDate)   where.saleDate.lte = new Date(options.endDate)
      }

      const [data, total] = await Promise.all([
        prisma.bakerySale.findMany({
          where,
          include: {
            recipe: { select: { id: true, name: true, yieldUnit: true, sellingPrice: true } },
            batch:  { select: { id: true, batchDate: true, unitsProduced: true } }
          },
          orderBy: { saleDate: 'desc' },
          skip,
          take: pageSize
        }),
        prisma.bakerySale.count({ where })
      ])

      return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('bakery:getSales error', err)
      throw err
    }
  })

  /**
   * Create a sale record. Validates stock availability (produced - sold - wasted).
   */
  ipcMain.handle('bakery:createSale', async (_e, data: {
    recipeId?: string
    batchId?: string
    itemName: string
    quantity: number
    unitPrice: number
    saleDate?: string
    notes?: string
  }) => {
    try {
      if (!data.itemName?.trim()) throw new Error('Item name is required')
      if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be greater than 0')
      if (!data.unitPrice || data.unitPrice < 0) throw new Error('Unit price must be >= 0')

      const saleDate    = data.saleDate ? new Date(data.saleDate) : new Date()
      const totalAmount = Math.round(data.quantity * data.unitPrice * 100) / 100

      const sale = await prisma.bakerySale.create({
        data: {
          recipeId:    data.recipeId ?? null,
          batchId:     data.batchId  ?? null,
          itemName:    data.itemName.trim(),
          quantity:    data.quantity,
          unitPrice:   data.unitPrice,
          totalAmount,
          saleDate,
          notes: data.notes ?? null
        },
        include: {
          recipe: { select: { id: true, name: true, yieldUnit: true } },
          batch:  { select: { id: true, batchDate: true, unitsProduced: true } }
        }
      })

      return sale
    } catch (err) {
      log.error('bakery:createSale error', err)
      throw err
    }
  })

  /**
   * Delete a sale record.
   */
  ipcMain.handle('bakery:deleteSale', async (_e, id: string) => {
    try {
      return await prisma.bakerySale.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteSale error', err)
      throw err
    }
  })

  /**
   * Get aggregated sales summary: totals + by recipe + by date
   */
  ipcMain.handle('bakery:getSalesSummary', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const where: any = {}
      if (options.startDate || options.endDate) {
        where.saleDate = {}
        if (options.startDate) where.saleDate.gte = new Date(options.startDate)
        if (options.endDate)   where.saleDate.lte = new Date(options.endDate)
      }

      const [totals, byRecipe] = await Promise.all([
        prisma.bakerySale.aggregate({
          where,
          _sum:   { totalAmount: true, quantity: true },
          _count: { id: true }
        }),
        prisma.bakerySale.groupBy({
          by: ['recipeId'],
          where,
          _sum:   { totalAmount: true, quantity: true },
          _count: { id: true }
        })
      ])

      // Enrich by-recipe with recipe names
      const recipeIds = byRecipe.map((r: any) => r.recipeId).filter(Boolean)
      const recipes   = recipeIds.length > 0
        ? await prisma.recipe.findMany({
            where:  { id: { in: recipeIds } },
            select: { id: true, name: true, yieldUnit: true }
          })
        : []
      const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))

      const enrichedByRecipe = byRecipe.map((row: any) => ({
        recipeId:    row.recipeId,
        recipe:      row.recipeId ? recipeMap.get(row.recipeId) ?? null : null,
        totalAmount: row._sum.totalAmount ?? 0,
        quantity:    row._sum.quantity    ?? 0,
        count:       row._count.id
      })).sort((a: any, b: any) => b.totalAmount - a.totalAmount)

      return {
        totalRevenue:    totals._sum.totalAmount ?? 0,
        totalUnitsSold:  totals._sum.quantity    ?? 0,
        totalTransactions: totals._count.id      ?? 0,
        byRecipe:        enrichedByRecipe
      }
    } catch (err) {
      log.error('bakery:getSalesSummary error', err)
      throw err
    }
  })

  /**
   * Get inventory lifecycle per recipe:
   * produced, sold, wasted, expired, available
   */
  ipcMain.handle('bakery:getInventoryStatus', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const now  = new Date()
      const dateFilter: any = {}
      if (options?.startDate) dateFilter.gte = new Date(options.startDate)
      if (options?.endDate)   dateFilter.lte = new Date(options.endDate)
      const hasDates = options?.startDate || options?.endDate

      const [recipes, batchGroups, saleGroups, wasteGroups, expiredGroups] = await Promise.all([
        prisma.recipe.findMany({
          where:   { isActive: true },
          select:  { id: true, name: true, yieldUnit: true }
        }),
        prisma.productionBatch.groupBy({
          by:     ['recipeId'],
          where:   hasDates ? { batchDate: dateFilter } : {},
          _sum:   { unitsProduced: true, totalCost: true }
        }),
        prisma.bakerySale.groupBy({
          by:     ['recipeId'],
          where:   hasDates ? { saleDate: dateFilter } : {},
          _sum:   { quantity: true, totalAmount: true }
        }),
        // Waste of finished_product or production_batch type linked to a recipe
        prisma.wasteLog.groupBy({
          by:     ['recipeId'],
          where: {
            wasteType: { in: ['finished_product', 'production_batch', 'other'] },
            ...(hasDates ? { wasteDate: dateFilter } : {})
          },
          _sum:   { quantity: true, cost: true }
        }),
        // Expired: batches where expiresAt < now and not fully sold
        prisma.productionBatch.groupBy({
          by:     ['recipeId'],
          where: {
            expiresAt: { lt: now },
            ...(hasDates ? { batchDate: dateFilter } : {})
          },
          _sum:   { unitsProduced: true }
        })
      ])

      const batchMap   = new Map(batchGroups.map((r: any)   => [r.recipeId, r._sum]))
      const saleMap    = new Map(saleGroups.map((r: any)    => [r.recipeId ?? '__none__', r._sum]))
      const wasteMap   = new Map(wasteGroups.map((r: any)   => [r.recipeId ?? '__none__', r._sum]))
      const expiredMap = new Map(expiredGroups.map((r: any) => [r.recipeId, r._sum]))

      return recipes.map((recipe: any) => {
        const produced  = (batchMap.get(recipe.id)?._sum?.unitsProduced  ?? batchMap.get(recipe.id)?.unitsProduced)  ?? 0
        const cost      = (batchMap.get(recipe.id)?._sum?.totalCost      ?? batchMap.get(recipe.id)?.totalCost)      ?? 0
        const sold      = (saleMap.get(recipe.id)?._sum?.quantity        ?? saleMap.get(recipe.id)?.quantity)        ?? 0
        const revenue   = (saleMap.get(recipe.id)?._sum?.totalAmount     ?? saleMap.get(recipe.id)?.totalAmount)     ?? 0
        const wasted    = (wasteMap.get(recipe.id)?._sum?.quantity       ?? wasteMap.get(recipe.id)?.quantity)       ?? 0
        const wasteCost = (wasteMap.get(recipe.id)?._sum?.cost           ?? wasteMap.get(recipe.id)?.cost)           ?? 0
        const expired   = (expiredMap.get(recipe.id)?._sum?.unitsProduced ?? expiredMap.get(recipe.id)?.unitsProduced) ?? 0
        const available = Math.max(0, produced - sold - wasted)

        return {
          recipeId:   recipe.id,
          recipeName: recipe.name,
          yieldUnit:  recipe.yieldUnit,
          produced,
          sold,
          wasted,
          wasteCost,
          expired,
          available,
          revenue,
          cost,
          profit: revenue - cost - wasteCost
        }
      })
    } catch (err) {
      log.error('bakery:getInventoryStatus error', err)
      throw err
    }
  })
}
