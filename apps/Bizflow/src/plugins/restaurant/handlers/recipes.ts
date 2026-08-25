import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertToBaseUnit } from '../utils/mathEngine'

const log = createLogger('Restaurant:Recipes')

export function registerRecipeHandlers(prisma: any) {
  ipcMain.handle('restaurant:getRecipes', async () => {
    try {
      return await prisma.menuItemRecipe.findMany({
        include: {
          menuItem: true,
          ingredients: { include: { ingredient: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    } catch (err) {
      log.error('getRecipes error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:saveRecipe', async (_e, data: {
    menuItemId: string
    yieldCount: number
    prepNotes?: string
    ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const existing = await tx.menuItemRecipe.findUnique({ where: { menuItemId: data.menuItemId } })

      if (existing) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } })
        await tx.menuItemRecipe.update({
          where: { id: existing.id },
          data: {
            yieldCount: Math.max(1, Number(data.yieldCount || 1)),
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
        await tx.menuItemRecipe.create({
          data: {
            menuItemId: data.menuItemId,
            yieldCount: Math.max(1, Number(data.yieldCount || 1)),
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

      // Auto-compute Dish Food Cost based on linked ingredient prices
      const recipe = await tx.menuItemRecipe.findUnique({
        where: { menuItemId: data.menuItemId },
        include: { ingredients: { include: { ingredient: true } } }
      })

      if (recipe) {
        const totalBatchCost = recipe.ingredients.reduce((sum: number, item: any) => {
          const { normalizedQty } = convertToBaseUnit(item.quantity, item.unit)
          const unitCost = item.ingredient?.costPerUnit || 0
          return sum + normalizedQty * unitCost
        }, 0)

        const portionCost = roundMoney(totalBatchCost / (recipe.yieldCount || 1))

        await tx.menuItem.update({
          where: { id: data.menuItemId },
          data: { cost: portionCost }
        })
      }

      return recipe
    })
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