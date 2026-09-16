// src/restaurant/handlers/menu.ts
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, computeRecipeBatchCost, computePortionCost } from '../utils/mathEngine'

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
  ipcMain.handle(
    'restaurant:createMenuItem',
    async (
      _e,
      data: {
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
      }
    ) => {
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
            const batchCost = computeRecipeBatchCost(recipe.ingredients)
            const dishCost = computePortionCost(batchCost, recipe.yieldCount)

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
    }
  )

  // ─── Update Menu Item & Recipe BOM ────────────────────────────────────────
  ipcMain.handle(
    'restaurant:updateMenuItem',
    async (_e, data: { id: string; [key: string]: any }) => {
      return await prisma.$transaction(async (tx: any) => {
        const { id, modifierGroups, recipeIngredients, yieldCount, ...rest } = data
        if (!id) throw new Error('Menu item id is required')

        if (rest.price !== undefined) rest.price = roundMoney(Number(rest.price))
        if (rest.cost !== undefined) rest.cost = roundMoney(Number(rest.cost))
        if (rest.preparationTime !== undefined) rest.preparationTime = Number(rest.preparationTime)
        if (rest.displayOrder !== undefined) rest.displayOrder = Number(rest.displayOrder)

        // 1. Persist the dish fields themselves. Without this the whole edit was
        // silently discarded and the caller still received a 200-style response.
        // Whitelisted so a stray UI-only key can never reach Prisma.
        const ALLOWED = [
          'name',
          'category',
          'description',
          'price',
          'cost',
          'taxRate',
          'preparationTime',
          'station',
          'isAvailable',
          'displayOrder',
          'colorTag',
          'barcode',
          'notes'
        ]
        const scalarFields: Record<string, unknown> = {}
        for (const key of ALLOWED) {
          if (rest[key] !== undefined) scalarFields[key] = rest[key]
        }
        if (Object.keys(scalarFields).length > 0) {
          await tx.menuItem.update({ where: { id }, data: scalarFields })
        }

        // 2. Replace modifier groups when the caller supplied them (an omitted
        // key means "leave modifiers alone", an empty array means "remove all").
        if (modifierGroups !== undefined) {
          await tx.modifierGroup.deleteMany({ where: { menuItemId: id } })
          for (const g of modifierGroups as any[]) {
            const group = await tx.modifierGroup.create({
              data: {
                menuItemId: id,
                title: g.title,
                minSelect: Number(g.minSelect || 0),
                maxSelect: Number(g.maxSelect || 1)
              }
            })
            for (const o of g.options || []) {
              await tx.modifierOption.create({
                data: {
                  groupId: group.id,
                  name: o.name,
                  priceDelta: roundMoney(Number(o.priceDelta || 0)),
                  costDelta: roundMoney(Number(o.costDelta || 0))
                }
              })
            }
          }
        }

        // Update recipe if provided
        if (recipeIngredients) {
          await tx.RecipeIngredientRestaurant.deleteMany({
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
            const batchCost = computeRecipeBatchCost(freshRecipe.ingredients)
            const dishCost = computePortionCost(batchCost, freshRecipe.yieldCount)

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
    }
  )

  // ─── Modifier Groups (standalone CRUD) ────────────────────────────────────
  // Exposed through preload as saveModifierGroup/deleteModifierGroup. They used
  // to have no handler at all, so any caller hit
  // "No handler registered for 'restaurant:saveModifierGroup'".
  ipcMain.handle(
    'restaurant:saveModifierGroup',
    async (
      _e,
      data: {
        id?: string
        menuItemId: string
        title: string
        minSelect?: number
        maxSelect?: number
        options?: Array<{ name: string; priceDelta?: number; costDelta?: number }>
      }
    ) => {
      try {
        if (!data?.menuItemId) throw new Error('menuItemId is required')
        if (!data?.title?.trim()) throw new Error('Modifier group title is required')

        return await prisma.$transaction(async (tx: any) => {
          const minSelect = Math.max(0, Number(data.minSelect || 0))
          const maxSelect = Math.max(1, Number(data.maxSelect || 1))
          if (maxSelect < minSelect) {
            throw new Error('Maximum selections cannot be lower than the minimum')
          }

          // Replacing the group wholesale keeps options in sync without a diff pass.
          if (data.id) {
            const existing = await tx.modifierGroup.findUnique({ where: { id: data.id } })
            if (!existing) throw new Error('Modifier group not found')
            if (existing.menuItemId !== data.menuItemId) {
              throw new Error('Modifier group does not belong to this menu item')
            }
            await tx.modifierGroup.delete({ where: { id: data.id } })
          }

          return await tx.modifierGroup.create({
            data: {
              menuItemId: data.menuItemId,
              title: data.title.trim(),
              minSelect,
              maxSelect,
              options: {
                create: (data.options || []).map((o) => ({
                  name: o.name,
                  priceDelta: roundMoney(Number(o.priceDelta || 0)),
                  costDelta: roundMoney(Number(o.costDelta || 0))
                }))
              }
            },
            include: { options: true }
          })
        })
      } catch (err) {
        log.error('saveModifierGroup error', err)
        throw err
      }
    }
  )

  ipcMain.handle('restaurant:deleteModifierGroup', async (_e, id: string) => {
    try {
      if (!id) throw new Error('Modifier group id is required')
      return await prisma.modifierGroup.delete({ where: { id } })
    } catch (err) {
      log.error('deleteModifierGroup error', err)
      throw err
    }
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
