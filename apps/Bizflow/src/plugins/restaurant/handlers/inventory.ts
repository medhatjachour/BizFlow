import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertBetweenUnits, sameUnitFamily } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'
import { refreshMenuItemsUsingIngredient } from '../utils/costing'

const log = createLogger('Restaurant:Inventory')

/**
 * `RestaurantIngredient.unit` is the ingredient's own unit of measure and the
 * unit every stored number is expressed in — `currentStock`, `minStockAlert`
 * and `costPerUnit` all share it. Nothing is normalised to a hidden base unit
 * on the way in: the till, the recipe editor and the pantry screen all read the
 * declared unit back, so storing grams under a `kg` label (or the reverse)
 * makes every downstream number wrong by the conversion factor.
 */
function resolveUnit(unit?: string | null, fallback = 'g'): string {
  const value = (unit || '').trim()
  return value || fallback
}

export function registerInventoryHandlers(prisma: any) {
  ipcMain.handle(
    'restaurant:createIngredient',
    async (
      _e,
      data: {
        name: string
        category: string
        unit: string
        currentStock: number
        minStockAlert: number
        costPerUnit: number
        supplierName?: string
        notes?: string
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        const unit = resolveUnit(data.unit)
        const stock = roundMoney(Math.max(0, Number(data.currentStock || 0)))
        const alert = roundMoney(Math.max(0, Number(data.minStockAlert || 0)))

        const ingredient = await tx.restaurantIngredient.create({
          data: {
            name: data.name,
            category: data.category || 'General',
            unit,
            currentStock: stock,
            minStockAlert: alert,
            costPerUnit: roundMoney(Number(data.costPerUnit || 0)),
            supplierName: data.supplierName || null,
            notes: data.notes || null
          }
        })

        if (stock > 0) {
          await tx.ingredientStockMovement.create({
            data: {
              ingredientId: ingredient.id,
              type: 'restock',
              quantity: stock,
              unitCost: ingredient.costPerUnit,
              referenceId: ingredient.id,
              notes: 'Initial inventory entry'
            }
          })
        }

        return ingredient
      })
    }
  )

  ipcMain.handle(
    'restaurant:adjustStock',
    async (
      _e,
      data: {
        ingredientId: string
        type: 'restock' | 'manual_adjustment'
        quantity: number
        unit?: string
        unitCost?: number
        notes?: string
        referenceId?: string
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        const ingredient = await tx.restaurantIngredient.findUnique({
          where: { id: data.ingredientId }
        })
        if (!ingredient) throw new Error('Ingredient not found')

        const priceChanged =
          data.unitCost !== undefined &&
          roundMoney(Number(data.unitCost)) !== ingredient.costPerUnit

        // Callers may express the movement in whatever unit is convenient
        // (receiving a 25 kg sack against an ingredient stocked in grams), so
        // bring it into the ingredient's own unit before touching the ledger.
        const movementUnit = data.unit ? resolveUnit(data.unit) : ingredient.unit
        if (data.unit && !sameUnitFamily(movementUnit, ingredient.unit)) {
          throw new Error(
            `Cannot adjust ${ingredient.name} in ${movementUnit}: stock is tracked in ${ingredient.unit}`
          )
        }

        const qtyDelta = roundMoney(
          convertBetweenUnits(Number(data.quantity), movementUnit, ingredient.unit)
        )

        const newStock =
          data.type === 'manual_adjustment'
            ? roundMoney(Math.max(0, qtyDelta))
            : roundMoney(Math.max(0, ingredient.currentStock + qtyDelta))

        const movementQty =
          data.type === 'manual_adjustment'
            ? roundMoney(newStock - ingredient.currentStock)
            : qtyDelta

        const updated = await tx.restaurantIngredient.update({
          where: { id: data.ingredientId },
          data: {
            currentStock: newStock,
            ...(data.unitCost !== undefined
              ? { costPerUnit: roundMoney(Number(data.unitCost)) }
              : {})
          }
        })

        await tx.ingredientStockMovement.create({
          data: {
            ingredientId: data.ingredientId,
            type: data.type,
            quantity: movementQty,
            unitCost:
              data.unitCost !== undefined
                ? roundMoney(Number(data.unitCost))
                : ingredient.costPerUnit,
            referenceId: data.referenceId || null,
            notes: data.notes || null
          }
        })

        // A new purchase price must flow through to every dish built from this
        // ingredient, otherwise menu margins silently drift.
        if (priceChanged) {
          const menuItemIds = await refreshMenuItemsUsingIngredient(tx, data.ingredientId)
          for (const menuItemId of menuItemIds) {
            broadcastRestaurantEvent('menu:updated', { id: menuItemId })
          }
        }

        if (newStock <= ingredient.minStockAlert) {
          broadcastRestaurantEvent('inventory:low_stock', updated)
        }

        broadcastRestaurantEvent('inventory:updated', updated)

        return updated
      })
    }
  )

  ipcMain.handle(
    'restaurant:updateIngredient',
    async (
      _e,
      data: {
        id: string
        name?: string
        category?: string
        unit?: string
        minStockAlert?: number
        costPerUnit?: number
        supplierName?: string
        notes?: string
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        if (!data?.id) throw new Error('Ingredient id is required')

        const current = await tx.restaurantIngredient.findUnique({ where: { id: data.id } })
        if (!current) throw new Error('Ingredient not found')

        // Stock levels never move through this path — they are audited through
        // adjustStock so every change leaves a stock movement behind.
        const nextUnit =
          data.unit !== undefined ? resolveUnit(data.unit, current.unit) : current.unit
        const unitChanged = nextUnit !== current.unit

        if (unitChanged && !sameUnitFamily(nextUnit, current.unit)) {
          throw new Error(
            `Cannot switch ${current.name} from ${current.unit} to ${nextUnit}: these measure different things`
          )
        }

        const priceChanged =
          data.costPerUnit !== undefined &&
          roundMoney(Number(data.costPerUnit)) !== current.costPerUnit

        // Re-labelling the unit means the stored figures now mean something
        // else, so carry the physical quantity across instead of reinterpreting
        // "10" from kilograms into grams.
        const restatedStock = unitChanged
          ? roundMoney(convertBetweenUnits(current.currentStock, current.unit, nextUnit))
          : null
        const restatedAlert = unitChanged
          ? roundMoney(convertBetweenUnits(current.minStockAlert, current.unit, nextUnit))
          : null

        // A caller that has not restated the threshold itself sends the
        // pre-change figure untouched — detect that and restate it here, so the
        // alert can never silently change meaning with the unit.
        const nextAlert =
          data.minStockAlert !== undefined
            ? unitChanged && roundMoney(Number(data.minStockAlert)) === current.minStockAlert
              ? restatedAlert
              : roundMoney(Math.max(0, Number(data.minStockAlert)))
            : restatedAlert

        const updated = await tx.restaurantIngredient.update({
          where: { id: data.id },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.category !== undefined ? { category: data.category } : {}),
            ...(unitChanged ? { unit: nextUnit } : {}),
            ...(restatedStock !== null ? { currentStock: restatedStock } : {}),
            ...(nextAlert !== null ? { minStockAlert: nextAlert } : {}),
            ...(data.costPerUnit !== undefined
              ? { costPerUnit: roundMoney(Number(data.costPerUnit)) }
              : {}),
            ...(data.supplierName !== undefined ? { supplierName: data.supplierName || null } : {}),
            ...(data.notes !== undefined ? { notes: data.notes || null } : {})
          }
        })

        if (priceChanged) {
          const menuItemIds = await refreshMenuItemsUsingIngredient(tx, data.id)
          for (const menuItemId of menuItemIds) {
            broadcastRestaurantEvent('menu:updated', { id: menuItemId })
          }
        }

        if (updated.currentStock <= updated.minStockAlert) {
          broadcastRestaurantEvent('inventory:low_stock', updated)
        }

        broadcastRestaurantEvent('inventory:updated', updated)

        return updated
      })
    }
  )

  ipcMain.handle('restaurant:getStockMovements', async (_e, ingredientId?: string) => {
    try {
      const where: any = {}
      if (ingredientId) where.ingredientId = ingredientId

      return await prisma.ingredientStockMovement.findMany({
        where,
        include: { ingredient: true },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    } catch (err) {
      log.error('getStockMovements error', err)
      throw err
    }
  })
  // In src/restaurant/handlers/inventory.ts -> getIngredients handler:
  ipcMain.handle('restaurant:getIngredients', async () => {
    try {
      return await prisma.restaurantIngredient.findMany({
        where: { isActive: true },
        include: {
          recipeUsages: {
            include: {
              recipe: {
                include: { menuItem: true }
              }
            }
          }
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      })
    } catch (err) {
      log.error('getIngredients error', err)
      throw err
    }
  })

  // ─── Which dishes would break if this ingredient disappeared ───────────────
  ipcMain.handle('restaurant:getIngredientUsage', async (_e, ingredientId: string) => {
    try {
      const usages = await prisma.recipeIngredientRestaurant.findMany({
        where: { ingredientId },
        include: { recipe: { include: { menuItem: true } } }
      })

      return usages.map((u: any) => ({
        recipeId: u.recipeId,
        menuItemId: u.recipe?.menuItemId,
        menuItemName: u.recipe?.menuItem?.name || 'Unnamed dish',
        quantity: u.quantity,
        unit: u.unit
      }))
    } catch (err) {
      log.error('getIngredientUsage error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:deleteIngredient', async (_e, id: string) => {
    try {
      // Soft-deleting an ingredient that still backs a recipe removes it from
      // the pantry screen (getIngredients filters isActive) while the recipe
      // keeps pointing at it, leaving a bill of materials nobody can edit.
      // Refuse instead, and name the dishes in the way.
      const usages = await prisma.recipeIngredientRestaurant.findMany({
        where: { ingredientId: id },
        include: { recipe: { include: { menuItem: true } } }
      })

      if (usages.length > 0) {
        const dishNames = Array.from(
          new Set<string>(usages.map((u: any) => u.recipe?.menuItem?.name || 'Unnamed dish'))
        )
        throw new Error(
          `This ingredient is used by ${dishNames.length} recipe(s): ${dishNames.join(', ')}. Remove it from those recipes first.`
        )
      }

      const deleted = await prisma.restaurantIngredient.update({
        where: { id },
        data: { isActive: false }
      })
      broadcastRestaurantEvent('inventory:updated', deleted)
      return deleted
    } catch (err) {
      log.error('deleteIngredient error', err)
      throw err
    }
  })
}
