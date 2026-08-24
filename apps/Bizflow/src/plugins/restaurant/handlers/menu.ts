// src/restaurant/handlers/menu.ts
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, convertToBaseUnit } from '../utils/mathEngine'

const log = createLogger('Restaurant:Menu')

export function registerMenuHandlers(prisma: any) {
  // ─── Get Menu Items with Full Recipe BOM & Live Inventory ─────────────────
  ipcMain.handle('restaurant:getMenuItems', async () => {
    try {
      return await prisma.menuItem.findMany({
        include: {
          modifierGroups: {
            include: { options: true }
          },
          recipe: {
            include: {
              ingredients: {
                include: { ingredient: true }
              }
            }
          }
        },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }]
      })
    } catch (err) {
      log.error('getMenuItems error', err)
      throw err
    }
  })

  // ─── Create Menu Item with Inline Recipe Builder ──────────────────────────
  ipcMain.handle('restaurant:createMenuItem', async (_e, data: {
    name: string
    category: string
    description?: string
    price: number
    preparationTime?: number
    station?: string
    colorTag?: string
    barcode?: string
    notes?: string
    modifierGroups?: Array<{
      title: string
      minSelect: number
      maxSelect: number
      options: Array<{ name: string; priceDelta: number }>
    }>
    recipeIngredients?: Array<{
      ingredientId: string
      quantity: number
      unit: string
    }>
    yieldCount?: number
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const { modifierGroups, recipeIngredients, yieldCount, ...rest } = data

      // 1. Create Menu Dish
      const item = await tx.menuItem.create({
        data: {
          name: rest.name,
          category: rest.category || 'Main Dishes',
          description: rest.description || null,
          price: roundMoney(Number(rest.price)),
          preparationTime: Number(rest.preparationTime || 15),
          station: rest.station || 'Kitchen',
          colorTag: rest.colorTag || null,
          barcode: rest.barcode || null,
          notes: rest.notes || null,
          modifierGroups: modifierGroups?.length
            ? {
                create: modifierGroups.map((g) => ({
                  title: g.title,
                  minSelect: Number(g.minSelect || 0),
                  maxSelect: Number(g.maxSelect || 1),
                  options: {
                    create: g.options.map((o) => ({
                      name: o.name,
                      priceDelta: roundMoney(Number(o.priceDelta || 0))
                    }))
                  }
                }))
              }
            : undefined
        }
      })

      // 2. Create Linked Recipe BOM (if ingredients provided)
      if (recipeIngredients && recipeIngredients.length > 0) {
        await tx.menuItemRecipe.create({
          data: {
            menuItemId: item.id,
            yieldCount: Math.max(1, Number(yieldCount || 1)),
            ingredients: {
              create: recipeIngredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: Number(ing.quantity),
                unit: ing.unit
              }))
            }
          }
        })

        // Auto-calculate exact Dish Cost based on ingredient purchase prices
        const recipe = await tx.menuItemRecipe.findUnique({
          where: { menuItemId: item.id },
          include: { ingredients: { include: { ingredient: true } } }
        })

        if (recipe) {
          const totalCost = recipe.ingredients.reduce((sum: number, ri: any) => {
            const { normalizedQty } = convertToBaseUnit(ri.quantity, ri.unit)
            return sum + normalizedQty * (ri.ingredient?.costPerUnit || 0)
          }, 0)
          const dishCost = roundMoney(totalCost / (recipe.yieldCount || 1))

          await tx.menuItem.update({
            where: { id: item.id },
            data: { cost: dishCost }
          })
        }
      }

      return await tx.menuItem.findUnique({
        where: { id: item.id },
        include: {
          modifierGroups: { include: { options: true } },
          recipe: { include: { ingredients: { include: { ingredient: true } } } }
        }
      })
    })
  })

  // ─── Update Menu Item & Recipe BOM ────────────────────────────────────────
  ipcMain.handle('restaurant:updateMenuItem', async (_e, data: { id: string; [key: string]: any }) => {
    return await prisma.$transaction(async (tx: any) => {
      const { id, modifierGroups, recipeIngredients, yieldCount, ...rest } = data

      if (rest.price !== undefined) rest.price = roundMoney(Number(rest.price))
      if (rest.cost !== undefined) rest.cost = roundMoney(Number(rest.cost))

      const updated = await tx.menuItem.update({
        where: { id },
        data: rest
      })

      // Update recipe if provided
      if (recipeIngredients) {
        await tx.recipeIngredient.deleteMany({
          where: { recipe: { menuItemId: id } }
        })

        const existingRecipe = await tx.menuItemRecipe.findUnique({ where: { menuItemId: id } })
        if (existingRecipe) {
          await tx.menuItemRecipe.update({
            where: { id: existingRecipe.id },
            data: {
              yieldCount: Math.max(1, Number(yieldCount || 1)),
              ingredients: {
                create: recipeIngredients.map((ing: any) => ({
                  ingredientId: ing.ingredientId,
                  quantity: Number(ing.quantity),
                  unit: ing.unit
                }))
              }
            }
          })
        } else if (recipeIngredients.length > 0) {
          await tx.menuItemRecipe.create({
            data: {
              menuItemId: id,
              yieldCount: Math.max(1, Number(yieldCount || 1)),
              ingredients: {
                create: recipeIngredients.map((ing: any) => ({
                  ingredientId: ing.ingredientId,
                  quantity: Number(ing.quantity),
                  unit: ing.unit
                }))
              }
            }
          })
        }

        // Recalculate cost
        const freshRecipe = await tx.menuItemRecipe.findUnique({
          where: { menuItemId: id },
          include: { ingredients: { include: { ingredient: true } } }
        })

        if (freshRecipe) {
          const totalCost = freshRecipe.ingredients.reduce((sum: number, ri: any) => {
            const { normalizedQty } = convertToBaseUnit(ri.quantity, ri.unit)
            return sum + normalizedQty * (ri.ingredient?.costPerUnit || 0)
          }, 0)
          const dishCost = roundMoney(totalCost / (freshRecipe.yieldCount || 1))

          await tx.menuItem.update({
            where: { id },
            data: { cost: dishCost }
          })
        }
      }

      return await tx.menuItem.findUnique({
        where: { id },
        include: {
          modifierGroups: { include: { options: true } },
          recipe: { include: { ingredients: { include: { ingredient: true } } } }
        }
      })
    })
  })

  // ─── 86 Out of Stock Toggle ───────────────────────────────────────────────
  ipcMain.handle('restaurant:toggleItem86', async (_e, id: string) => {
    try {
      const item = await prisma.menuItem.findUnique({ where: { id } })
      if (!item) throw new Error('Menu item not found')
      return await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: !item.isAvailable }
      })
    } catch (err) {
      log.error('toggleItem86 error', err)
      throw err
    }
  })

  // ─── Delete Menu Item ─────────────────────────────────────────────────────
  ipcMain.handle('restaurant:deleteMenuItem', async (_e, id: string) => {
    try {
      return await prisma.menuItem.delete({ where: { id } })
    } catch (err) {
      log.error('deleteMenuItem error', err)
      throw err
    }
  })
}