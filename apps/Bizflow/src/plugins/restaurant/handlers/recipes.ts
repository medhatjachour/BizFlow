import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Recipes')

export function registerRecipeHandlers(prisma: any) {
  ipcMain.handle('restaurant:getRecipes', async () => {
    try {
      return await prisma.menuItemRecipe.findMany({
        include: {
          menuItem: true,
          ingredients: {
            include: { ingredient: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } catch (err) {
      log.error('getRecipes error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:getRecipeForMenuItem', async (_e, menuItemId: string) => {
    try {
      return await prisma.menuItemRecipe.findUnique({
        where: { menuItemId },
        include: {
          menuItem: true,
          ingredients: {
            include: { ingredient: true }
          }
        }
      })
    } catch (err) {
      log.error('getRecipeForMenuItem error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:saveRecipe', async (_e, data: {
    menuItemId: string
    yieldCount: number
    prepNotes?: string
    ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
  }) => {
    try {
      const existing = await prisma.menuItemRecipe.findUnique({
        where: { menuItemId: data.menuItemId }
      })

      if (existing) {
        await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } })
        await prisma.menuItemRecipe.update({
          where: { id: existing.id },
          data: {
            yieldCount: Number(data.yieldCount || 1),
            prepNotes: data.prepNotes || null,
            ingredients: {
              create: data.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: Number(ing.quantity),
                unit: ing.unit,
                notes: ing.notes || null
              }))
            }
          }
        })
      } else {
        await prisma.menuItemRecipe.create({
          data: {
            menuItemId: data.menuItemId,
            yieldCount: Number(data.yieldCount || 1),
            prepNotes: data.prepNotes || null,
            ingredients: {
              create: data.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: Number(ing.quantity),
                unit: ing.unit,
                notes: ing.notes || null
              }))
            }
          }
        })
      }

      // Automatically recalculate MenuItem Cost based on ingredients
      const updatedRecipe = await prisma.menuItemRecipe.findUnique({
        where: { menuItemId: data.menuItemId },
        include: { ingredients: { include: { ingredient: true } } }
      })

      if (updatedRecipe) {
        const totalCalculatedCost = updatedRecipe.ingredients.reduce((acc: number, item: any) => {
          const unitCost = item.ingredient?.costPerUnit || 0
          return acc + item.quantity * unitCost
        }, 0)

        const unitDishCost = totalCalculatedCost / (updatedRecipe.yieldCount || 1)

        await prisma.menuItem.update({
          where: { id: data.menuItemId },
          data: { cost: Number(unitDishCost.toFixed(2)) }
        })
      }

      return updatedRecipe
    } catch (err) {
      log.error('saveRecipe error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:deleteRecipe', async (_e, recipeId: string) => {
    try {
      return await prisma.menuItemRecipe.delete({ where: { id: recipeId } })
    } catch (err) {
      log.error('deleteRecipe error', err)
      throw err
    }
  })
}