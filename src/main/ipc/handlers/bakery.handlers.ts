/**
 * Bakery Module IPC Handlers
 *
 * Handles CRUD for:
 *  - Recipes & RecipeIngredients
 *  - ProductionBatches (with auto-pantry deduction, expiry calc)
 *  - PantryIngredients (ingredient stock tracking)
 *  - WasteLogs
 *  - ProductionSchedule
 *  - Analytics (P&L summary, waste summary)
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Bakery')

export function registerBakeryHandlers(prisma: any) {
  // ─── Recipes ─────────────────────────────────────────────────────────────

  /** Return all recipes with their ingredients */
  ipcMain.handle('bakery:getRecipes', async () => {
    try {
      return await prisma.recipe.findMany({
        where: { isActive: true },
        include: {
          ingredients: {
            include: { pantryIngredient: { select: { id: true, name: true, currentStock: true, unit: true } } },
            orderBy: { createdAt: 'asc' }
          },
          outputProduct: {
            select: { id: true, name: true, basePrice: true, baseCost: true }
          },
          _count: { select: { productionBatches: true } }
        },
        orderBy: { name: 'asc' }
      })
    } catch (err) {
      log.error('bakery:getRecipes error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:createRecipe', async (_e, data: {
    name: string
    description?: string
    outputProductId?: string
    yieldQty: number
    yieldUnit: string
    expiryDays?: number
    notes?: string
    ingredients: Array<{
      name: string
      quantity: number
      unit: string
      costPerUnit: number
      supplierName?: string
      pantryIngredientId?: string
    }>
  }) => {
    try {
      return await prisma.recipe.create({
        data: {
          name: data.name,
          description: data.description,
          outputProductId: data.outputProductId || null,
          yieldQty: Number(data.yieldQty),
          yieldUnit: data.yieldUnit,
          expiryDays: data.expiryDays ? Number(data.expiryDays) : null,
          notes: data.notes,
          ingredients: {
            create: data.ingredients.map(ing => ({
              name: ing.name,
              quantity: Number(ing.quantity),
              unit: ing.unit,
              costPerUnit: Number(ing.costPerUnit),
              supplierName: ing.supplierName || null,
              pantryIngredientId: ing.pantryIngredientId || null
            }))
          }
        },
        include: { ingredients: true }
      })
    } catch (err) {
      log.error('bakery:createRecipe error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:updateRecipe', async (_e, data: {
    id: string
    name?: string
    description?: string
    outputProductId?: string | null
    yieldQty?: number
    yieldUnit?: string
    expiryDays?: number | null
    notes?: string
    ingredients?: Array<{
      name: string
      quantity: number
      unit: string
      costPerUnit: number
      supplierName?: string
      pantryIngredientId?: string
    }>
  }) => {
    try {
      const { id, ingredients, ...fields } = data
      // Coerce numeric fields so Prisma always receives numbers, not strings
      const safeFields: any = { ...fields }
      if (safeFields.yieldQty !== undefined) safeFields.yieldQty = Number(safeFields.yieldQty)
      if (safeFields.expiryDays !== undefined && safeFields.expiryDays !== null)
        safeFields.expiryDays = Number(safeFields.expiryDays)
      return await prisma.$transaction(async (tx: any) => {
        if (ingredients !== undefined) {
          await tx.recipeIngredient.deleteMany({ where: { recipeId: id } })
        }
        return tx.recipe.update({
          where: { id },
          data: {
            ...safeFields,
            ...(ingredients !== undefined && {
              ingredients: {
                create: ingredients.map(ing => ({
                  name: ing.name,
                  quantity: Number(ing.quantity),
                  unit: ing.unit,
                  costPerUnit: Number(ing.costPerUnit),
                  supplierName: ing.supplierName || null,
                  pantryIngredientId: ing.pantryIngredientId || null
                }))
              }
            })
          },
          include: { ingredients: true }
        })
      })
    } catch (err) {
      log.error('bakery:updateRecipe error', err)
      throw err
    }
  })

  /** Soft-delete: mark recipe inactive */
  ipcMain.handle('bakery:deleteRecipe', async (_e, id: string) => {
    try {
      return await prisma.recipe.update({
        where: { id },
        data: { isActive: false }
      })
    } catch (err) {
      log.error('bakery:deleteRecipe error', err)
      throw err
    }
  })

  // ─── Production Batches ──────────────────────────────────────────────────

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

  /**
   * Record a new production batch.
   * Auto-deducts linked pantry ingredients and calculates expiry date.
   */
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
        include: { ingredients: true },
        // outputProductId is a scalar field, included by default
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
        // Auto-deduct from pantry if ingredient is linked
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

        // Increment output product variant stock by units produced
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

  /** Delete a production batch record */
  ipcMain.handle('bakery:deleteProductionBatch', async (_e, id: string) => {
    try {
      return await prisma.productionBatch.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteProductionBatch error', err)
      throw err
    }
  })

  /**
   * Circular ingredient → product capacity calculation.
   *
   * For every active recipe, checks each ingredient that is linked to a
   * PantryIngredient and computes:
   *   maxBatchesFromPantry = floor(pantryStock / ingredientQtyPerBatch)
   *
   * The minimum across all linked ingredients is the real available capacity.
   * Ingredients not linked to the pantry are ignored (treated as unlimited).
   *
   * Returns per-recipe:
   *  { recipeId, recipeName, yieldQty, yieldUnit, availableBatches,
   *    expectedUnits, limitedBy, ingredients[] }
   */
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

        // If no ingredient is linked to pantry, report null (unlimited / unknown)
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

  // ─── Analytics / P&L ────────────────────────────────────────────────────

  /**
   * Bakery Profit & Loss summary.
   *
   * For each recipe that has an outputProduct, we:
   *   - Sum totalCost from all production batches (ingredient cost)
   *   - Sum revenue from SaleItems for that product
   *   - Compute gross profit and margin
   */
  ipcMain.handle('bakery:getProfitLoss', async (_e, options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    try {
      const dateFilter: any = {}
      if (options.startDate) dateFilter.gte = new Date(options.startDate)
      if (options.endDate) dateFilter.lte = new Date(options.endDate)
      const hasDates = options.startDate || options.endDate

      // All active recipes
      const recipes = await prisma.recipe.findMany({
        where: { isActive: true },
        include: { ingredients: true }
      })

      // Production cost per recipe
      const batchCostGrouped = await prisma.productionBatch.groupBy({
        by: ['recipeId'],
        _sum: { totalCost: true, unitsProduced: true },
        where: hasDates ? { batchDate: dateFilter } : {}
      })
      const batchCostMap = new Map<string, { totalCost: number; unitsProduced: number }>(
        batchCostGrouped.map((r: any) => [
          r.recipeId,
          {
            totalCost: r._sum.totalCost ?? 0,
            unitsProduced: r._sum.unitsProduced ?? 0
          }
        ])
      )

      // Revenue per outputProduct from SaleItems
      const saleItems = await prisma.saleItem.findMany({
        where: hasDates ? { transaction: { createdAt: dateFilter } } : {},
        select: { productId: true, total: true, quantity: true }
      })
      const revenueMap = new Map<string, { total: number; qty: number }>()
      for (const si of saleItems) {
        const prev = revenueMap.get(si.productId) ?? { total: 0, qty: 0 }
        revenueMap.set(si.productId, { total: prev.total + si.total, qty: prev.qty + si.quantity })
      }

      // Waste cost per recipe
      const wasteLogs = await prisma.wasteLog.groupBy({
        by: ['recipeId'],
        _sum: { cost: true },
        where: hasDates ? { wasteDate: dateFilter } : {}
      })
      const wasteMap = new Map<string, number>(
        wasteLogs.map((w: any) => [w.recipeId ?? '__none__', w._sum.cost ?? 0])
      )
      const totalWasteCost = wasteLogs.reduce((s: number, w: any) => s + (w._sum.cost ?? 0), 0)

      // Build per-recipe summary
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

  // ─── Expiry Alerts ────────────────────────────────────────────────────────

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

  // ─── Pantry / Ingredient Stock ────────────────────────────────────────────

  ipcMain.handle('bakery:getPantry', async () => {
    try {
      return await prisma.pantryIngredient.findMany({
        include: { _count: { select: { recipeIngredients: true } } },
        orderBy: { name: 'asc' }
      })
    } catch (err) {
      log.error('bakery:getPantry error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:upsertPantryIngredient', async (_e, data: {
    id?: string
    name: string
    currentStock: number
    unit: string
    costPerUnit?: number
    lowStockThreshold?: number
    reorderPoint?: number
    reorderQuantity?: number
    supplierName?: string
    notes?: string
  }) => {
    try {
      const fields = {
        name: data.name,
        currentStock: data.currentStock,
        unit: data.unit,
        costPerUnit: data.costPerUnit ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? null,
        reorderPoint: data.reorderPoint ?? null,
        reorderQuantity: data.reorderQuantity ?? null,
        supplierName: data.supplierName ?? null,
        notes: data.notes ?? null
      }
      if (data.id) {
        return await prisma.pantryIngredient.update({ where: { id: data.id }, data: fields })
      }
      return await prisma.pantryIngredient.create({ data: fields })
    } catch (err) {
      log.error('bakery:upsertPantryIngredient error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:adjustPantryStock', async (_e, data: {
    id: string
    adjustment: number
    reason?: string
  }) => {
    try {
      return await prisma.pantryIngredient.update({
        where: { id: data.id },
        data: { currentStock: { increment: data.adjustment } }
      })
    } catch (err) {
      log.error('bakery:adjustPantryStock error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:deletePantryIngredient', async (_e, id: string) => {
    try {
      return await prisma.pantryIngredient.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deletePantryIngredient error', err)
      throw err
    }
  })

  // ─── Waste Log ────────────────────────────────────────────────────────────

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
    wasteType: string          // 'ingredient' | 'finished_product' | 'production_batch' | 'other'
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
      return await prisma.$transaction(async (tx) => {
        // 1. Create the waste log record
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

        // 2. Deduct stock based on waste type
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
        // 'production_batch' and 'other' types do not auto-deduct stock

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

  // ─── Production Schedule ──────────────────────────────────────────────────

  ipcMain.handle('bakery:getSchedule', async (_e, options: {
    startDate?: string
    endDate?: string
    status?: string
    recipeId?: string
  } = {}) => {
    try {
      const where: any = {}
      if (options.recipeId) where.recipeId = options.recipeId
      if (options.status) where.status = options.status
      if (options.startDate || options.endDate) {
        where.scheduledDate = {}
        if (options.startDate) where.scheduledDate.gte = new Date(options.startDate)
        if (options.endDate) where.scheduledDate.lte = new Date(options.endDate)
      }
      return await prisma.productionSchedule.findMany({
        where,
        include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } },
        orderBy: { scheduledDate: 'asc' }
      })
    } catch (err) {
      log.error('bakery:getSchedule error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:createScheduleItem', async (_e, data: {
    recipeId: string
    scheduledDate: string
    plannedQuantity: number
    notes?: string
  }) => {
    try {
      return await prisma.productionSchedule.create({
        data: {
          recipeId: data.recipeId,
          scheduledDate: new Date(data.scheduledDate),
          plannedQuantity: data.plannedQuantity,
          notes: data.notes ?? null,
          status: 'planned'
        },
        include: { recipe: { select: { id: true, name: true } } }
      })
    } catch (err) {
      log.error('bakery:createScheduleItem error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:updateScheduleItem', async (_e, data: {
    id: string
    status?: 'planned' | 'in-progress' | 'completed' | 'cancelled'
    actualQuantity?: number
    plannedQuantity?: number
    scheduledDate?: string
    notes?: string
  }) => {
    try {
      const { id, scheduledDate, ...fields } = data
      return await prisma.productionSchedule.update({
        where: { id },
        data: {
          ...fields,
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) })
        },
        include: { recipe: { select: { id: true, name: true } } }
      })
    } catch (err) {
      log.error('bakery:updateScheduleItem error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:deleteScheduleItem', async (_e, id: string) => {
    try {
      return await prisma.productionSchedule.delete({ where: { id } })
    } catch (err) {
      log.error('bakery:deleteScheduleItem error', err)
      throw err
    }
  })

  // ─── Daily Overview ───────────────────────────────────────────────────────

  /**
   * Returns a command-center overview for today:
   *  - Today's scheduled items
   *  - Expiring batches (within 2 days)
   *  - Low-stock pantry items
   *  - Reorder-needed pantry items
   *  - Capacity (what can be made right now)
   */
  ipcMain.handle('bakery:getDailyOverview', async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(todayStart.getTime() + 86400000 - 1)
      const twoDaysOut = new Date(todayStart.getTime() + 2 * 86400000)

      const [scheduled, expiringBatches, lowStockItems] = await Promise.all([
        // Today's schedule
        prisma.productionSchedule.findMany({
          where: { scheduledDate: { gte: todayStart, lte: todayEnd } },
          include: { recipe: { select: { id: true, name: true, yieldQty: true, yieldUnit: true } } },
          orderBy: { scheduledDate: 'asc' }
        }),
        // Batches expiring within 2 days
        prisma.productionBatch.findMany({
          where: { expiresAt: { gte: now, lte: twoDaysOut } },
          include: { recipe: { select: { id: true, name: true } } },
          orderBy: { expiresAt: 'asc' }
        }),
        // Low / reorder-needed pantry items
        prisma.pantryIngredient.findMany({
          where: {
            OR: [
              { currentStock: { lte: prisma.pantryIngredient.fields.lowStockThreshold } },
              // Fallback: just get all and filter JS-side
            ]
          }
        }).catch(() =>
          // Fallback if expression filter fails
          prisma.pantryIngredient.findMany()
        )
      ])

      // Filter low stock JS-side for safety
      const lowStock = (lowStockItems as any[]).filter(
        (p: any) => p.lowStockThreshold > 0 && p.currentStock <= p.lowStockThreshold
      )
      const reorderNeeded = (lowStockItems as any[]).filter(
        (p: any) => p.reorderPoint != null && p.currentStock <= p.reorderPoint
      )

      // Capacity (reuse same logic as getAvailableBatches)
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

      // Today's completed batches
      const todayBatches = await prisma.productionBatch.findMany({
        where: { batchDate: { gte: todayStart, lte: todayEnd } },
        include: { recipe: { select: { name: true, yieldUnit: true } } }
      })

      // Today's sales revenue
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

  // ─── Pantry Reorder ───────────────────────────────────────────────────────

  /** Mark a pantry item as reordered (sets lastOrderedDate). Optionally add stock. */
  ipcMain.handle('bakery:markPantryReordered', async (_e, data: {
    id: string
    quantityReceived?: number
  }) => {
    try {
      return await prisma.pantryIngredient.update({
        where: { id: data.id },
        data: {
          lastOrderedDate: new Date(),
          ...(data.quantityReceived != null && {
            currentStock: { increment: data.quantityReceived }
          })
        }
      })
    } catch (err) {
      log.error('bakery:markPantryReordered error', err)
      throw err
    }
  })

  // ─── Production Requirements (pre-confirm) ────────────────────────────────

  /** Returns per-ingredient stock check for a recipe × batch count. */
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

  // ─── End-of-Day Suggestion ────────────────────────────────────────────────

  /**
   * For each completed production batch today, compute estimated sold vs unsold
   * by looking at SaleItems for the linked outputProduct.
   */
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

      // Aggregate units sold per product today
      const saleItems = await prisma.saleItem.findMany({
        where: { transaction: { createdAt: { gte: todayStart, lte: todayEnd } } },
        select: { productId: true, quantity: true }
      })
      const soldMap = new Map<string, number>()
      for (const si of saleItems) {
        soldMap.set(si.productId, (soldMap.get(si.productId) ?? 0) + si.quantity)
      }

      // Group batches by recipe
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

  // ─── P&L Trend ───────────────────────────────────────────────────────────

  /**
   * Returns weekly P&L trend per recipe for the last N weeks.
   */
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

      // Group by ISO week string "YYYY-Www"
      const getWeek = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7)
        return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
      }

      // Revenue per product per week
      const revMap = new Map<string, Map<string, number>>()
      for (const si of saleItems as any[]) {
        const week = getWeek(new Date(si.transaction.createdAt))
        if (!revMap.has(si.productId)) revMap.set(si.productId, new Map())
        const m = revMap.get(si.productId)!
        m.set(week, (m.get(week) ?? 0) + si.total)
      }

      // Cost per recipe per week
      const costMap = new Map<string, Map<string, number>>()
      for (const batch of batches as any[]) {
        const week = getWeek(new Date(batch.batchDate))
        if (!costMap.has(batch.recipeId)) costMap.set(batch.recipeId, new Map())
        const m = costMap.get(batch.recipeId)!
        m.set(week, (m.get(week) ?? 0) + batch.totalCost)
      }

      // Collect all weeks
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
}
