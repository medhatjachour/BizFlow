import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Pantry')

export function registerPantryHandlers(prisma: any) {
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
    } catch (err: any) {
      if (err?.code === 'P2002') throw new Error('DUPLICATE_NAME')
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

  ipcMain.handle('bakery:markPantryReordered', async (_e, data: {
    id: string
    quantityReceived?: number
    purchasePrice?: number
  }) => {
    try {
      return await prisma.pantryIngredient.update({
        where: { id: data.id },
        data: {
          lastOrderedDate: new Date(),
          ...(data.quantityReceived != null && {
            currentStock: { increment: data.quantityReceived }
          }),
          ...(data.purchasePrice != null && data.purchasePrice > 0 && {
            costPerUnit: data.purchasePrice
          })
        }
      })
    } catch (err) {
      log.error('bakery:markPantryReordered error', err)
      throw err
    }
  })

  ipcMain.handle('bakery:bulkRestock', async (_e, items: Array<{
    id: string
    quantityReceived?: number
    purchasePrice?: number
  }>) => {
    try {
      const results: any[] = []
      for (const item of items) {
        const result = await prisma.pantryIngredient.update({
          where: { id: item.id },
          data: {
            lastOrderedDate: new Date(),
            ...(item.quantityReceived != null && {
              currentStock: { increment: item.quantityReceived }
            }),
            ...(item.purchasePrice != null && item.purchasePrice > 0 && {
              costPerUnit: item.purchasePrice
            })
          }
        })
        results.push(result)
      }
      return results
    } catch (err) {
      log.error('bakery:bulkRestock error', err)
      throw err
    }
  })
}
