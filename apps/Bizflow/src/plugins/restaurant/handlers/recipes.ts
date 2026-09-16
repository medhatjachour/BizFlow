import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { computeRecipeBatchCost, computePortionCost, sameUnitFamily } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

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

  ipcMain.handle(
    'restaurant:saveRecipe',
    async (
      _e,
      data: {
        menuItemId: string
        yieldCount: number
        prepNotes?: string
        ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }>
      }
    ) => {
      if (!data?.menuItemId) throw new Error('A menu item is required to save a recipe')

      // A recipe with no lines is a legitimate way to clear a bill of materials,
      // but `undefined` means the caller never sent one — that is a bug upstream,
      // not an instruction to wipe the dish's cost.
      const lines = Array.isArray(data.ingredients) ? data.ingredients : null
      if (lines === null) throw new Error('The recipe ingredient list is missing')

      const usableLines = lines.filter(
        (line) => line && line.ingredientId && Number(line.quantity) > 0
      )

      return await prisma.$transaction(async (tx: any) => {
        const menuItem = await tx.menuItem.findUnique({ where: { id: data.menuItemId } })
        if (!menuItem) throw new Error('Menu item not found')

        // Validate every ingredient up front. Letting the foreign key fail turns
        // a stale picker entry into an opaque SQLite constraint error.
        const ingredientIds = Array.from(
          new Set<string>(usableLines.map((line) => line.ingredientId))
        )
        if (ingredientIds.length > 0) {
          const found = await tx.restaurantIngredient.findMany({
            where: { id: { in: ingredientIds }, isActive: true },
            select: { id: true, name: true, unit: true }
          })
          const byId = new Map<string, { id: string; name: string; unit: string }>(
            found.map((i: any) => [i.id, i])
          )
          const missing = ingredientIds.filter((id) => !byId.has(id))
          if (missing.length > 0) {
            throw new Error(
              `${missing.length} ingredient(s) in this recipe no longer exist. Remove them and try again.`
            )
          }

          const crossFamily = usableLines.filter((line) => {
            const ing = byId.get(line.ingredientId)!
            return !sameUnitFamily(line.unit || ing.unit, ing.unit)
          })
          if (crossFamily.length > 0) {
            const names = crossFamily.map((line) => byId.get(line.ingredientId)!.name).join(', ')
            throw new Error(
              `These lines use a unit that cannot be measured against the ingredient's own unit: ${names}`
            )
          }
        }

        const existing = await tx.menuItemRecipe.findUnique({
          where: { menuItemId: data.menuItemId }
        })

        let activeRecipeId: string

        if (existing) {
          await tx.recipeIngredientRestaurant.deleteMany({ where: { recipeId: existing.id } })
          const updated = await tx.menuItemRecipe.update({
            where: { id: existing.id },
            data: {
              yieldCount: Math.max(1, Number(data.yieldCount || 1)),
              prepNotes: data.prepNotes || null
            }
          })
          activeRecipeId = updated.id
        } else {
          const created = await tx.menuItemRecipe.create({
            data: {
              menuItemId: data.menuItemId,
              yieldCount: Math.max(1, Number(data.yieldCount || 1)),
              prepNotes: data.prepNotes || null
            }
          })
          activeRecipeId = created.id
        }

        if (usableLines.length > 0) {
          await tx.recipeIngredientRestaurant.createMany({
            data: usableLines.map((ing) => ({
              recipeId: activeRecipeId,
              ingredientId: ing.ingredientId,
              quantity: Number(ing.quantity),
              unit: ing.unit,
              notes: ing.notes || null
            }))
          })
        }

        // Auto-compute Dish Food Cost based on linked ingredient prices
        const recipe = await tx.menuItemRecipe.findUnique({
          where: { menuItemId: data.menuItemId },
          include: { ingredients: { include: { ingredient: true } } }
        })

        // A recipe with no lines has no food cost — zero it rather than leaving
        // the previous dish cost attached to an empty bill of materials.
        const batchCost = recipe ? computeRecipeBatchCost(recipe.ingredients) : 0
        const portionCost = computePortionCost(batchCost, recipe?.yieldCount || 1)

        await tx.menuItem.update({
          where: { id: data.menuItemId },
          data: { cost: portionCost }
        })

        broadcastRestaurantEvent('menu:updated', { id: data.menuItemId, cost: portionCost })

        return recipe
      })
    }
  )

  ipcMain.handle('restaurant:deleteRecipe', async (_e, recipeId: string) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const recipe = await tx.menuItemRecipe.findUnique({ where: { id: recipeId } })
        if (!recipe) throw new Error('Recipe not found')

        await tx.menuItemRecipe.delete({ where: { id: recipeId } })

        // The dish no longer deducts any stock, so it must no longer carry a
        // food cost either — otherwise margins keep reporting a phantom COGS.
        const updated = await tx.menuItem.update({
          where: { id: recipe.menuItemId },
          data: { cost: 0 }
        })

        broadcastRestaurantEvent('menu:updated', { id: recipe.menuItemId, cost: 0 })

        return updated
      })
    } catch (err) {
      log.error('deleteRecipe error', err)
      throw err
    }
  })
}
