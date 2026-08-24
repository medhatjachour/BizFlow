import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

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
    try {
      const ingredient = await prisma.restaurantIngredient.create({
        data: {
          name: data.name,
          category: data.category || 'General',
          unit: data.unit || 'kg',
          currentStock: Number(data.currentStock || 0),
          minStockAlert: Number(data.minStockAlert || 5),
          costPerUnit: Number(data.costPerUnit || 0),
          supplierName: data.supplierName || null,
          notes: data.notes || null
        }
      })

      if (Number(data.currentStock) > 0) {
        await prisma.ingredientStockMovement.create({
          data: {
            ingredientId: ingredient.id,
            type: 'restock',
            quantity: Number(data.currentStock),
            unitCost: Number(data.costPerUnit || 0),
            notes: 'Initial inventory stock'
          }
        })
      }

      return ingredient
    } catch (err) {
      log.error('createIngredient error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:updateIngredient', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      if (rest.currentStock !== undefined) rest.currentStock = Number(rest.currentStock)
      if (rest.minStockAlert !== undefined) rest.minStockAlert = Number(rest.minStockAlert)
      if (rest.costPerUnit !== undefined) rest.costPerUnit = Number(rest.costPerUnit)

      return await prisma.restaurantIngredient.update({
        where: { id },
        data: rest
      })
    } catch (err) {
      log.error('updateIngredient error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:adjustStock', async (_e, data: {
    ingredientId: string
    type: 'restock' | 'manual_adjustment'
    quantity: number
    unitCost?: number
    notes?: string
  }) => {
    try {
      const ingredient = await prisma.restaurantIngredient.findUnique({
        where: { id: data.ingredientId }
      })
      if (!ingredient) throw new Error('Ingredient not found')

      const qtyChange = Number(data.quantity)
      const newStock = Math.max(0, ingredient.currentStock + qtyChange)

      const updated = await prisma.restaurantIngredient.update({
        where: { id: data.ingredientId },
        data: {
          currentStock: newStock,
          ...(data.unitCost !== undefined ? { costPerUnit: Number(data.unitCost) } : {})
        }
      })

      await prisma.ingredientStockMovement.create({
        data: {
          ingredientId: data.ingredientId,
          type: data.type,
          quantity: qtyChange,
          unitCost: data.unitCost !== undefined ? Number(data.unitCost) : ingredient.costPerUnit,
          notes: data.notes || null
        }
      })

      return updated
    } catch (err) {
      log.error('adjustStock error', err)
      throw err
    }
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