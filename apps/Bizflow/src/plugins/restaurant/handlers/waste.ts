// src/restaurant/handlers/waste.ts
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertBetweenUnits, sameUnitFamily } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Waste')

export function registerWasteHandlers(prisma: any) {
  // ─── Get Waste Logs with Filters ──────────────────────────────────────────
  ipcMain.handle(
    'restaurant:getWasteLogs',
    async (
      _e,
      options?: {
        startDate?: string
        endDate?: string
        reason?: string
      }
    ) => {
      try {
        const where: any = {}
        if (options?.reason && options.reason !== 'ALL') where.reason = options.reason
        if (options?.startDate || options?.endDate) {
          where.createdAt = {}
          if (options.startDate) where.createdAt.gte = new Date(options.startDate)
          if (options.endDate) where.createdAt.lte = new Date(options.endDate)
        }

        return await prisma.restaurantWasteLog.findMany({
          where,
          include: { ingredient: true },
          orderBy: { createdAt: 'desc' }
        })
      } catch (err) {
        log.error('getWasteLogs error', err)
        throw err
      }
    }
  )

  // ─── Waste & Shrinkage Financial Analytics ─────────────────────────────────
  ipcMain.handle(
    'restaurant:getWasteAnalytics',
    async (_e, options?: { startDate?: string; endDate?: string }) => {
      try {
        const where: any = {}
        if (options?.startDate || options?.endDate) {
          where.createdAt = {}
          if (options.startDate) where.createdAt.gte = new Date(options.startDate)
          if (options.endDate) where.createdAt.lte = new Date(options.endDate)
        }

        const logs = await prisma.restaurantWasteLog.findMany({
          where,
          include: { ingredient: true }
        })

        let totalLoss = 0
        const reasonBreakdown: Record<string, { count: number; totalCost: number }> = {}
        const itemBreakdown: Record<
          string,
          { name: string; quantity: number; unit: string; totalCost: number }
        > = {}

        logs.forEach((log) => {
          totalLoss += log.costLoss

          // Reason breakdown
          if (!reasonBreakdown[log.reason]) {
            reasonBreakdown[log.reason] = { count: 0, totalCost: 0 }
          }
          reasonBreakdown[log.reason].count += 1
          reasonBreakdown[log.reason].totalCost = roundMoney(
            reasonBreakdown[log.reason].totalCost + log.costLoss
          )

          // Item breakdown — keyed on name *and* unit, because summing 500 g of
          // trim with 2 kg of trim would report a meaningless "502".
          const key = `${log.itemName}::${log.unit}`
          if (!itemBreakdown[key]) {
            itemBreakdown[key] = { name: log.itemName, quantity: 0, unit: log.unit, totalCost: 0 }
          }
          itemBreakdown[key].quantity = roundMoney(itemBreakdown[key].quantity + log.quantity)
          itemBreakdown[key].totalCost = roundMoney(itemBreakdown[key].totalCost + log.costLoss)
        })

        const topLossItems = Object.values(itemBreakdown)
          .sort((a, b) => b.totalCost - a.totalCost)
          .slice(0, 5)

        return {
          totalEntries: logs.length,
          totalLoss: roundMoney(totalLoss),
          reasonBreakdown,
          topLossItems
        }
      } catch (err) {
        log.error('getWasteAnalytics error', err)
        throw err
      }
    }
  )

  // ─── Log Waste & Auto-Deduct Stock ────────────────────────────────────────
  ipcMain.handle(
    'restaurant:logWaste',
    async (
      _e,
      data: {
        ingredientId?: string
        itemName: string
        quantity: number
        unit: string
        costLoss?: number
        reason: string
        loggedBy?: string
        notes?: string
      }
    ) => {
      const result = await prisma.$transaction(async (tx: any) => {
        let costLoss = roundMoney(Number(data.costLoss || 0))
        let stockShortfall = false
        let deductedIngredient: any = null

        if (data.ingredientId) {
          const ing = await tx.restaurantIngredient.findUnique({ where: { id: data.ingredientId } })
          if (!ing) throw new Error('Ingredient not found')

          const wasteUnit = (data.unit || ing.unit).trim() || ing.unit
          if (!sameUnitFamily(wasteUnit, ing.unit)) {
            throw new Error(
              `Cannot log ${ing.name} waste in ${wasteUnit}: stock is tracked in ${ing.unit}`
            )
          }

          // Loss is valued at the pantry's price for the ingredient's own unit,
          // so a 200 g scrap of something priced per kg costs a fifth of the kg
          // price — not 200 times it.
          const deductQty = roundMoney(
            convertBetweenUnits(Number(data.quantity), wasteUnit, ing.unit)
          )
          costLoss = roundMoney(deductQty * ing.costPerUnit)
          const newStock = roundMoney(Math.max(0, ing.currentStock - deductQty))
          stockShortfall = newStock <= ing.minStockAlert
          deductedIngredient = ing

          await tx.restaurantIngredient.update({
            where: { id: data.ingredientId },
            data: { currentStock: newStock }
          })
        }

        // The log has to exist before the ledger entry so the movement can point
        // back at it — that link is the only way to reverse the deduction later.
        const wasteLog = await tx.restaurantWasteLog.create({
          data: {
            ingredientId: data.ingredientId || null,
            itemName: data.itemName,
            quantity: Number(data.quantity),
            unit: data.unit || 'g',
            costLoss,
            reason: data.reason || 'expired',
            loggedBy: data.loggedBy || 'Staff',
            notes: data.notes || null
          },
          include: { ingredient: true }
        })

        if (data.ingredientId && deductedIngredient) {
          const deductQty = roundMoney(
            convertBetweenUnits(
              Number(data.quantity),
              (data.unit || deductedIngredient.unit).trim() || deductedIngredient.unit,
              deductedIngredient.unit
            )
          )

          await tx.ingredientStockMovement.create({
            data: {
              ingredientId: data.ingredientId,
              type: 'waste',
              quantity: roundMoney(-Math.abs(deductQty)),
              unitCost: deductedIngredient.costPerUnit,
              referenceId: wasteLog.id,
              notes: `Waste: ${data.reason} (${data.notes || 'No notes'})`
            }
          })

          if (stockShortfall) {
            broadcastRestaurantEvent('inventory:low_stock', {
              ...deductedIngredient,
              currentStock: roundMoney(Math.max(0, deductedIngredient.currentStock - deductQty))
            })
          }
        }

        return wasteLog
      })

      broadcastRestaurantEvent('waste:logged', result)
      broadcastRestaurantEvent(
        'inventory:updated',
        result.ingredient || { id: result.ingredientId }
      )
      return result
    }
  )

  // ─── Delete Waste Log (reverses the stock deduction) ───────────────────────
  ipcMain.handle('restaurant:deleteWasteLog', async (_e, id: string) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const entry = await tx.restaurantWasteLog.findUnique({ where: { id } })
        if (!entry) throw new Error('Waste entry not found')

        if (entry.ingredientId) {
          const ing = await tx.restaurantIngredient.findUnique({
            where: { id: entry.ingredientId }
          })

          // Only reverse what this entry actually took out. Prefer the ledger
          // row (the audited figure); fall back to the log's own quantity when
          // the movement predates referenceId being written.
          const movement = await tx.ingredientStockMovement.findFirst({
            where: { ingredientId: entry.ingredientId, type: 'waste', referenceId: entry.id },
            orderBy: { createdAt: 'desc' }
          })

          if (ing) {
            const restoreQty = roundMoney(
              Math.abs(
                movement
                  ? Number(movement.quantity)
                  : convertBetweenUnits(entry.quantity, entry.unit, ing.unit)
              )
            )

            if (restoreQty > 0) {
              await tx.restaurantIngredient.update({
                where: { id: ing.id },
                data: { currentStock: roundMoney(ing.currentStock + restoreQty) }
              })

              await tx.ingredientStockMovement.create({
                data: {
                  ingredientId: ing.id,
                  type: 'void_reversal',
                  quantity: restoreQty,
                  unitCost: movement?.unitCost ?? ing.costPerUnit,
                  referenceId: entry.id,
                  notes: `Reversed waste entry (${entry.reason})`
                }
              })
            }
          }
        }

        const deleted = await tx.restaurantWasteLog.delete({ where: { id } })

        broadcastRestaurantEvent('waste:deleted', { id })
        broadcastRestaurantEvent('inventory:updated', { id: entry.ingredientId })
        return deleted
      })
    } catch (err) {
      log.error('deleteWasteLog error', err)
      throw err
    }
  })
}
