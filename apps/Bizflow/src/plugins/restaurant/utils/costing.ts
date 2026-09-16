// src/restaurant/utils/costing.ts
import { computeRecipeBatchCost, computePortionCost } from './mathEngine'

/**
 * Re-derives `menuItem.cost` for every dish whose recipe uses `ingredientId`.
 *
 * The pantry is the source of truth for price: the moment an ingredient's
 * purchase cost changes (restock at a new price, supplier update, or a stock
 * adjustment that carries a new unit cost) every dish built from it has a stale
 * food cost. Without this the menu keeps reporting margins computed against
 * yesterday's prices, and the recipe drawer disagrees with the menu badge.
 *
 * Must run inside the caller's transaction so a price change and its knock-on
 * dish costs commit or roll back together.
 *
 * @returns the ids of the menu items whose cost was rewritten.
 */
export async function refreshMenuItemsUsingIngredient(
  tx: any,
  ingredientId: string
): Promise<string[]> {
  const usages = await tx.recipeIngredientRestaurant.findMany({
    where: { ingredientId },
    select: { recipeId: true }
  })

  const recipeIds: string[] = Array.from(
    new Set<string>(usages.map((u: { recipeId: string }) => u.recipeId))
  )

  const touched: string[] = []

  for (const recipeId of recipeIds) {
    const recipe = await tx.menuItemRecipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: true } } }
    })
    if (!recipe) continue

    const portionCost = computePortionCost(
      computeRecipeBatchCost(recipe.ingredients),
      recipe.yieldCount
    )

    await tx.menuItem.update({
      where: { id: recipe.menuItemId },
      data: { cost: portionCost }
    })
    touched.push(recipe.menuItemId)
  }

  return touched
}
