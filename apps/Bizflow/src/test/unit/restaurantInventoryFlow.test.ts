/**
 * Restaurant pantry flows: inventory <-> waste <-> recipes <-> menu.
 *
 * These four screens are one system. A single ingredient carries a declared unit
 * of measure, and `currentStock`, `minStockAlert` and `costPerUnit` are all
 * expressed in *that* unit. Recipe lines and waste entries may be typed in a
 * different unit of the same family (a 200 g line against a per-kg ingredient),
 * and the handlers are the only place that conversion can happen.
 *
 * The bug this file pins down: `createIngredient` used to normalise
 * `currentStock`/`minStockAlert` to a hidden base unit while storing the
 * declared unit verbatim. Creating `{ unit: 'kg', currentStock: 10 }` stored
 * `10000`, so the pantry screen read "10000 kg", recipe deduction took 1000x
 * too much stock, and `totalValuation` was 1000x high.
 *
 * Run against an in-memory Prisma stand-in: the handlers are the contract, and
 * they are the layer where the unit maths lives.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ipcMain } from 'electron'

const sent: Array<{ event: string; payload: any }> = []

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (event: string, payload: any) => sent.push({ event, payload })
        }
      }
    ]
  }
}))

vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

type Handler = (event: unknown, ...args: any[]) => any

let handlers: Map<string, Handler>
let db: ReturnType<typeof createFakeDb>

let seq = 0
const nextId = (prefix: string): string => `${prefix}-${++seq}`

function createFakeDb() {
  const ingredients: any[] = []
  const movements: any[] = []
  const wasteLogs: any[] = []
  const recipeLines: any[] = []
  const recipes: any[] = []
  const menuItems: any[] = []

  const withRecipe = (line: any) => {
    const recipe = recipes.find((r) => r.id === line.recipeId)
    const menuItem = recipe ? menuItems.find((m) => m.id === recipe.menuItemId) : undefined
    return { ...line, recipe: recipe ? { ...recipe, menuItem } : null }
  }

  const hydrateRecipe = (recipe: any) => ({
    ...recipe,
    ingredients: recipeLines
      .filter((line) => line.recipeId === recipe.id)
      .map((line) => ({
        ...line,
        ingredient: ingredients.find((i) => i.id === line.ingredientId)
      }))
  })

  const prisma: any = {
    restaurantIngredient: {
      findUnique: async ({ where }: any) => {
        const row = ingredients.find((i) => i.id === where.id)
        return row ? { ...row } : null
      },
      findMany: async ({ where }: any = {}) => {
        let rows = ingredients.slice()
        if (where?.isActive !== undefined) rows = rows.filter((i) => i.isActive === where.isActive)
        if (where?.id?.in) rows = rows.filter((i) => where.id.in.includes(i.id))
        return rows.map((i) => ({ ...i }))
      },
      create: async ({ data }: any) => {
        const row = {
          id: nextId('ing'),
          isActive: true,
          supplierName: null,
          notes: null,
          ...data
        }
        ingredients.push(row)
        return { ...row }
      },
      update: async ({ where, data }: any) => {
        const row = ingredients.find((i) => i.id === where.id)
        if (!row) throw new Error('Ingredient not found')
        Object.assign(row, data)
        return { ...row }
      }
    },

    ingredientStockMovement: {
      create: async ({ data }: any) => {
        const row = { id: nextId('mov'), createdAt: new Date(), referenceId: null, ...data }
        movements.push(row)
        return { ...row }
      },
      findMany: async ({ where }: any = {}) =>
        movements
          .filter((m) => !where?.ingredientId || m.ingredientId === where.ingredientId)
          .map((m) => ({ ...m })),
      findFirst: async ({ where }: any = {}) => {
        const rows = movements.filter(
          (m) =>
            (where?.ingredientId === undefined || m.ingredientId === where.ingredientId) &&
            (where?.type === undefined || m.type === where.type) &&
            (where?.referenceId === undefined || m.referenceId === where.referenceId)
        )
        const row = rows[rows.length - 1]
        return row ? { ...row } : null
      }
    },

    restaurantWasteLog: {
      create: async ({ data }: any) => {
        const row = { id: nextId('waste'), createdAt: new Date(), ...data }
        wasteLogs.push(row)
        return { ...row, ingredient: ingredients.find((i) => i.id === row.ingredientId) ?? null }
      },
      findUnique: async ({ where }: any) => {
        const row = wasteLogs.find((w) => w.id === where.id)
        return row ? { ...row } : null
      },
      findMany: async () => wasteLogs.map((w) => ({ ...w })),
      delete: async ({ where }: any) => {
        const index = wasteLogs.findIndex((w) => w.id === where.id)
        if (index === -1) throw new Error('Waste entry not found')
        return { ...wasteLogs.splice(index, 1)[0] }
      }
    },

    menuItem: {
      findUnique: async ({ where }: any) => {
        const row = menuItems.find((m) => m.id === where.id)
        return row ? { ...row } : null
      },
      update: async ({ where, data }: any) => {
        const row = menuItems.find((m) => m.id === where.id)
        if (!row) throw new Error('Menu item not found')
        Object.assign(row, data)
        return { ...row }
      }
    },

    menuItemRecipe: {
      findUnique: async ({ where, include }: any) => {
        const row = recipes.find(
          (r) => (where?.id !== undefined && r.id === where.id) || r.menuItemId === where.menuItemId
        )
        if (!row) return null
        return include?.ingredients ? hydrateRecipe(row) : { ...row }
      },
      findMany: async () => recipes.map((r) => hydrateRecipe(r)),
      create: async ({ data }: any) => {
        const row = { id: nextId('recipe'), createdAt: new Date(), ...data }
        recipes.push(row)
        return { ...row }
      },
      update: async ({ where, data }: any) => {
        const row = recipes.find((r) => r.id === where.id)
        if (!row) throw new Error('Recipe not found')
        Object.assign(row, data)
        return { ...row }
      },
      delete: async ({ where }: any) => {
        const index = recipes.findIndex((r) => r.id === where.id)
        if (index === -1) throw new Error('Recipe not found')
        return { ...recipes.splice(index, 1)[0] }
      }
    },

    recipeIngredientRestaurant: {
      findMany: async ({ where }: any = {}) =>
        recipeLines
          .filter((line) => !where?.ingredientId || line.ingredientId === where.ingredientId)
          .map(withRecipe),
      createMany: async ({ data }: any) => {
        for (const line of data) recipeLines.push({ id: nextId('line'), ...line })
        return { count: data.length }
      },
      deleteMany: async ({ where }: any = {}) => {
        let count = 0
        for (let i = recipeLines.length - 1; i >= 0; i--) {
          if (!where?.recipeId || recipeLines[i].recipeId === where.recipeId) {
            recipeLines.splice(i, 1)
            count++
          }
        }
        return { count }
      }
    },

    $transaction: async (fn: any) => fn(prisma)
  }

  return { prisma, ingredients, movements, wasteLogs, recipeLines, recipes, menuItems }
}

const seedIngredient = (overrides: Partial<Record<string, any>> = {}) => {
  const row = {
    id: nextId('ing'),
    name: 'Beef',
    category: 'Meat',
    unit: 'kg',
    currentStock: 10,
    minStockAlert: 0,
    costPerUnit: 20,
    supplierName: null,
    notes: null,
    isActive: true,
    ...overrides
  }
  db.ingredients.push(row)
  return row
}

const seedRecipe = (
  menuItemName: string,
  lines: Array<{ ingredientId: string; quantity: number; unit: string }>,
  yieldCount = 1
) => {
  const menuItem = { id: nextId('menu'), name: menuItemName, cost: 0 }
  db.menuItems.push(menuItem)
  const recipe = { id: nextId('recipe'), menuItemId: menuItem.id, yieldCount, prepNotes: null }
  db.recipes.push(recipe)
  for (const line of lines) {
    db.recipeLines.push({ id: nextId('line'), recipeId: recipe.id, notes: null, ...line })
  }
  return { menuItem, recipe }
}

const run = (channel: string, ...args: any[]): Promise<any> => {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`No handler registered for ${channel}`)
  return handler({}, ...args)
}

const eventsOf = (event: string) => sent.filter((entry) => entry.event === event)

describe('restaurant pantry flow (inventory <-> recipes <-> waste <-> menu)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    sent.length = 0
    seq = 0
    db = createFakeDb()
    handlers = new Map()

    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, listener: Handler) => {
      handlers.set(channel, listener)
    }) as any)

    const [{ registerInventoryHandlers }, { registerWasteHandlers }, { registerRecipeHandlers }] =
      await Promise.all([
        import('../../plugins/restaurant/handlers/inventory'),
        import('../../plugins/restaurant/handlers/waste'),
        import('../../plugins/restaurant/handlers/recipes')
      ])

    registerInventoryHandlers(db.prisma)
    registerWasteHandlers(db.prisma)
    registerRecipeHandlers(db.prisma)
  })

  describe('the declared unit is the single source of truth', () => {
    it('stores a new ingredient in the unit the operator typed', async () => {
      const created = await run('restaurant:createIngredient', {
        name: 'Beef',
        category: 'Meat',
        unit: 'kg',
        currentStock: 10,
        minStockAlert: 2,
        costPerUnit: 18.4
      })

      expect(created.unit).toBe('kg')
      expect(created.currentStock).toBe(10)
      expect(created.minStockAlert).toBe(2)
      expect(created.costPerUnit).toBe(18.4)
      // The opening ledger row must agree with the stored stock.
      expect(db.movements[0]).toMatchObject({
        type: 'restock',
        quantity: 10,
        referenceId: created.id
      })
    })

    it('does not inflate a gram-denominated ingredient either', async () => {
      const created = await run('restaurant:createIngredient', {
        name: 'Parmesan',
        category: 'Dairy',
        unit: 'g',
        currentStock: 2500,
        minStockAlert: 300,
        costPerUnit: 0.012
      })

      expect(created.currentStock).toBe(2500)
      expect(created.minStockAlert).toBe(300)
    })

    it('defaults a missing unit instead of inventing a base unit', async () => {
      const created = await run('restaurant:createIngredient', {
        name: 'Loose',
        category: 'General',
        unit: '',
        currentStock: 4,
        minStockAlert: 0,
        costPerUnit: 1
      })

      expect(created.unit).toBe('g')
      expect(created.currentStock).toBe(4)
    })
  })

  describe('adjustStock', () => {
    it('treats a restock as a delta in the ingredient unit and converts foreign units', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      const afterRestock = await run('restaurant:adjustStock', {
        ingredientId: beef.id,
        type: 'restock',
        quantity: 5
      })
      expect(afterRestock.currentStock).toBe(15)

      const afterGrams = await run('restaurant:adjustStock', {
        ingredientId: beef.id,
        type: 'restock',
        quantity: 500,
        unit: 'g'
      })
      expect(afterGrams.currentStock).toBe(15.5)
      expect(db.movements[db.movements.length - 1]).toMatchObject({
        type: 'restock',
        quantity: 0.5
      })
    })

    it('treats a manual adjustment as an absolute audit count', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10 })

      const counted = await run('restaurant:adjustStock', {
        ingredientId: beef.id,
        type: 'manual_adjustment',
        quantity: 8
      })

      expect(counted.currentStock).toBe(8)
      // The ledger records what physically changed, not the new total.
      expect(db.movements[db.movements.length - 1]).toMatchObject({
        type: 'manual_adjustment',
        quantity: -2
      })
    })

    it('refuses a unit that measures something else', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10 })

      await expect(
        run('restaurant:adjustStock', {
          ingredientId: beef.id,
          type: 'restock',
          quantity: 1,
          unit: 'ml'
        })
      ).rejects.toThrow(/Cannot adjust/)

      expect(beef.currentStock).toBe(10)
    })
  })

  describe('recipes <-> menu', () => {
    it('prices a dish from its bill of materials in the ingredient unit', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      await run('restaurant:saveRecipe', {
        menuItemId: (() => {
          const menuItem = { id: nextId('menu'), name: 'Burger', cost: 0 }
          db.menuItems.push(menuItem)
          return menuItem.id
        })(),
        yieldCount: 1,
        ingredients: [{ ingredientId: beef.id, quantity: 0.5, unit: 'kg' }]
      })

      expect(db.menuItems[0].cost).toBe(10)
      expect(eventsOf('restaurant:event:menu:updated')).toHaveLength(1)
    })

    it('prices a gram line against a per-kilo ingredient without a 1000x error', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      const menuItem = { id: nextId('menu'), name: 'Steak', cost: 0 }
      db.menuItems.push(menuItem)

      await run('restaurant:saveRecipe', {
        menuItemId: menuItem.id,
        yieldCount: 1,
        ingredients: [{ ingredientId: beef.id, quantity: 200, unit: 'g' }]
      })

      expect(db.menuItems[0].cost).toBe(4)
    })

    it('rejects a line whose unit cannot be measured against the ingredient', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      const menuItem = { id: nextId('menu'), name: 'Soup', cost: 0 }
      db.menuItems.push(menuItem)

      await expect(
        run('restaurant:saveRecipe', {
          menuItemId: menuItem.id,
          yieldCount: 1,
          ingredients: [{ ingredientId: beef.id, quantity: 1, unit: 'ml' }]
        })
      ).rejects.toThrow(/unit/)
    })

    it('rejects a line pointing at an ingredient that no longer exists', async () => {
      const menuItem = { id: nextId('menu'), name: 'Ghost', cost: 0 }
      db.menuItems.push(menuItem)

      await expect(
        run('restaurant:saveRecipe', {
          menuItemId: menuItem.id,
          yieldCount: 1,
          ingredients: [{ ingredientId: 'deleted-ingredient', quantity: 1, unit: 'g' }]
        })
      ).rejects.toThrow(/no longer exist/)
    })

    it('zeroes the dish cost when the recipe is deleted', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      const { menuItem, recipe } = seedRecipe('Burger', [
        { ingredientId: beef.id, quantity: 0.5, unit: 'kg' }
      ])
      menuItem.cost = 10

      await run('restaurant:deleteRecipe', recipe.id)

      expect(db.menuItems[0].cost).toBe(0)
      expect(db.recipes).toHaveLength(0)
    })
  })

  describe('a price change propagates to every dish using the ingredient', () => {
    it('rewrites menu costs when an ingredient is restocked at a new price', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      const { menuItem } = seedRecipe('Burger', [
        { ingredientId: beef.id, quantity: 0.5, unit: 'kg' }
      ])
      menuItem.cost = 10

      const updated = await run('restaurant:adjustStock', {
        ingredientId: beef.id,
        type: 'restock',
        quantity: 2,
        unitCost: 30
      })

      expect(updated.costPerUnit).toBe(30)
      expect(menuItem.cost).toBe(15)
      expect(eventsOf('restaurant:event:menu:updated')).toHaveLength(1)
    })

    it('rewrites menu costs when the ingredient unit is re-labelled within its family', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      const { menuItem } = seedRecipe('Burger', [
        { ingredientId: beef.id, quantity: 200, unit: 'g' }
      ])
      menuItem.cost = 4

      const updated = await run('restaurant:updateIngredient', {
        id: beef.id,
        unit: 'g',
        costPerUnit: 0.02
      })

      // 10 kg becomes 10000 g — the physical quantity is carried across.
      expect(updated.unit).toBe('g')
      expect(updated.currentStock).toBe(10000)
      // 200 g at 0.02/g is still 4 per portion.
      expect(menuItem.cost).toBe(4)
      expect(eventsOf('restaurant:event:menu:updated')).toHaveLength(1)
    })

    it('refuses a unit change across families', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      await expect(run('restaurant:updateIngredient', { id: beef.id, unit: 'l' })).rejects.toThrow(
        /different things/
      )

      expect(beef.unit).toBe('kg')
    })
  })

  describe('waste <-> inventory', () => {
    it('deducts the converted quantity and values the loss in the ingredient unit', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      const log = await run('restaurant:logWaste', {
        ingredientId: beef.id,
        itemName: 'Beef',
        quantity: 500,
        unit: 'g',
        reason: 'trim',
        loggedBy: 'Chef'
      })

      expect(log.costLoss).toBe(10)
      expect(beef.currentStock).toBe(9.5)

      const movement = db.movements[db.movements.length - 1]
      expect(movement).toMatchObject({ type: 'waste', quantity: -0.5 })
      // The ledger row must point at the log so the deduction can be reversed.
      expect(movement.referenceId).toBe(log.id)
      expect(eventsOf('restaurant:event:waste:logged')).toHaveLength(1)
      expect(eventsOf('restaurant:event:inventory:updated')).toHaveLength(1)
    })

    it('refuses to log waste in a unit that measures something else', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      await expect(
        run('restaurant:logWaste', {
          ingredientId: beef.id,
          itemName: 'Beef',
          quantity: 1,
          unit: 'ml',
          reason: 'spill'
        })
      ).rejects.toThrow(/Cannot log/)

      expect(beef.currentStock).toBe(10)
    })

    it('restores exactly what was deducted when the entry is deleted', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      const log = await run('restaurant:logWaste', {
        ingredientId: beef.id,
        itemName: 'Beef',
        quantity: 500,
        unit: 'g',
        reason: 'trim'
      })
      expect(beef.currentStock).toBe(9.5)

      await run('restaurant:deleteWasteLog', log.id)

      expect(beef.currentStock).toBe(10)
      const reversal = db.movements[db.movements.length - 1]
      expect(reversal).toMatchObject({ type: 'void_reversal', quantity: 0.5 })
      expect(reversal.referenceId).toBe(log.id)
      expect(db.wasteLogs).toHaveLength(0)
      expect(eventsOf('restaurant:event:waste:deleted')).toHaveLength(1)
    })

    it('keeps gram and kilo waste of the same item apart in the analytics', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      await run('restaurant:logWaste', {
        ingredientId: beef.id,
        itemName: 'Beef',
        quantity: 500,
        unit: 'g',
        reason: 'trim'
      })
      await run('restaurant:logWaste', {
        ingredientId: beef.id,
        itemName: 'Beef',
        quantity: 1,
        unit: 'kg',
        reason: 'trim'
      })

      const analytics = await run('restaurant:getWasteAnalytics')
      expect(analytics.topLossItems).toHaveLength(2)
      expect(analytics.totalLoss).toBe(30)
    })
  })

  describe('deleting an ingredient that a recipe still needs', () => {
    it('refuses and names the dishes in the way', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      seedRecipe('Burger', [{ ingredientId: beef.id, quantity: 0.5, unit: 'kg' }])

      await expect(run('restaurant:deleteIngredient', beef.id)).rejects.toThrow(/Burger/)
      expect(beef.isActive).toBe(true)
    })

    it('soft-deletes an unused ingredient', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })

      await run('restaurant:deleteIngredient', beef.id)

      expect(beef.isActive).toBe(false)
      expect(eventsOf('restaurant:event:inventory:updated')).toHaveLength(1)
    })

    it('reports every dish that would break', async () => {
      const beef = seedIngredient({ unit: 'kg', currentStock: 10, costPerUnit: 20 })
      seedRecipe('Burger', [{ ingredientId: beef.id, quantity: 0.5, unit: 'kg' }])
      seedRecipe('Meatballs', [{ ingredientId: beef.id, quantity: 0.2, unit: 'kg' }])

      const usage = await run('restaurant:getIngredientUsage', beef.id)

      expect(usage.map((u: any) => u.menuItemName).sort()).toEqual(['Burger', 'Meatballs'])
      expect(usage[0].quantity).toBeGreaterThan(0)
    })
  })
})

describe('sameUnitFamily', () => {
  it('groups mass, volume and count units', async () => {
    const { sameUnitFamily } = await import('../../plugins/restaurant/utils/mathEngine')

    expect(sameUnitFamily('kg', 'g')).toBe(true)
    expect(sameUnitFamily('l', 'ml')).toBe(true)
    expect(sameUnitFamily('pcs', 'pcs')).toBe(true)

    expect(sameUnitFamily('kg', 'ml')).toBe(false)
    expect(sameUnitFamily('g', 'pcs')).toBe(false)
    expect(sameUnitFamily('unknown', 'g')).toBe(false)
  })
})
