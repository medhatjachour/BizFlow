import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertToBaseUnit } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Inventory')

export function registerInventoryHandlers(prisma: any) {
  ipcMain.handle('restaurant:getIngredients', async () => {
    try {
      return await prisma.restaurantIngredient.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      })
    } catch (err) {
      log.error('getIngredients error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:createIngredient', async (_e, data: {
    name: string
    category: string
    unit: string
    currentStock: number
    minStockAlert: number
    costPerUnit: number
    supplierName?: string
    notes?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const { normalizedQty: baseStock } = convertToBaseUnit(Number(data.currentStock || 0), data.unit || 'g')
      const { normalizedQty: baseAlert } = convertToBaseUnit(Number(data.minStockAlert || 500), data.unit || 'g')

      const ingredient = await tx.restaurantIngredient.create({
        data: {
          name: data.name,
          category: data.category || 'General',
          unit: data.unit || 'g',
          currentStock: roundMoney(baseStock),
          minStockAlert: roundMoney(baseAlert),
          costPerUnit: roundMoney(Number(data.costPerUnit || 0)),
          supplierName: data.supplierName || null,
          notes: data.notes || null
        }
      })

      if (baseStock > 0) {
        await tx.ingredientStockMovement.create({
          data: {
            ingredientId: ingredient.id,
            type: 'restock',
            quantity: roundMoney(baseStock),
            unitCost: ingredient.costPerUnit,
            notes: 'Initial inventory entry'
          }
        })
      }

      return ingredient
    })
  })

  ipcMain.handle('restaurant:adjustStock', async (_e, data: {
    ingredientId: string
    type: 'restock' | 'manual_adjustment'
    quantity: number
    unitCost?: number
    notes?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const ingredient = await tx.restaurantIngredient.findUnique({ where: { id: data.ingredientId } })
      if (!ingredient) throw new Error('Ingredient not found')

      const qtyDelta = roundMoney(Number(data.quantity))
      const newStock = roundMoney(
        data.type === 'manual_adjustment' ? Math.max(0, qtyDelta) : Math.max(0, ingredient.currentStock + qtyDelta)
      )

      const movementQty = data.type === 'manual_adjustment' ? roundMoney(newStock - ingredient.currentStock) : qtyDelta

      const updated = await tx.restaurantIngredient.update({
        where: { id: data.ingredientId },
        data: {
          currentStock: newStock,
          ...(data.unitCost !== undefined ? { costPerUnit: roundMoney(Number(data.unitCost)) } : {})
        }
      })

      await tx.ingredientStockMovement.create({
        data: {
          ingredientId: data.ingredientId,
          type: data.type,
          quantity: movementQty,
          unitCost: data.unitCost !== undefined ? roundMoney(Number(data.unitCost)) : ingredient.costPerUnit,
          notes: data.notes || null
        }
      })

      if (newStock <= ingredient.minStockAlert) {
        broadcastRestaurantEvent('inventory:low_stock', updated)
      }

      return updated
    })
  })

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

  ipcMain.handle('restaurant:deleteIngredient', async (_e, id: string) => {
    try {
      return await prisma.restaurantIngredient.update({
        where: { id },
        data: { isActive: false }
      })
    } catch (err) {
      log.error('deleteIngredient error', err)
      throw err
    }
  })
}