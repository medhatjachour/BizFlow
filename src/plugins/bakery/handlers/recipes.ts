import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Bakery:Recipes')

export function registerRecipeHandlers(prisma: any) {
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
    sellingPrice?: number
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
          sellingPrice: data.sellingPrice != null ? Number(data.sellingPrice) : null,
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
    sellingPrice?: number | null
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
      const safeFields: any = { ...fields }
      if (safeFields.yieldQty !== undefined) safeFields.yieldQty = Number(safeFields.yieldQty)
      if (safeFields.sellingPrice !== undefined && safeFields.sellingPrice !== null)
        safeFields.sellingPrice = Number(safeFields.sellingPrice)
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
}
