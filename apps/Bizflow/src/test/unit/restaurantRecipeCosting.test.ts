/**
 * Restaurant costing: the renderer preview and the main-process engine must agree.
 *
 * The recipe editor and the cost-breakdown drawer show a live per-portion cost
 * before anything is saved. The authoritative number is written by the main
 * process (`plugins/restaurant/utils/mathEngine.ts`) when the recipe is saved.
 * The renderer keeps its own copy of the maths (`pages/menu/costing.ts`) so the
 * form can react as the operator types — which means two implementations of the
 * same money maths, and nothing stopped them drifting apart.
 *
 * A drift here is a silent lie on screen: the operator sees one food cost, saves,
 * and the dish is written with another. The historical bug this guards against is
 * unit handling: `costPerUnit` and `currentStock` are denominated in the
 * *ingredient's own* unit, while recipe lines carry their own unit. Multiplying a
 * base-unit quantity by a per-unit-cost 1000x'd a `200 g` line against a per-`kg`
 * ingredient — in both the dish cost and the stock deduction.
 */

import { describe, expect, it } from 'vitest'

import {
  computeDishCost,
  computeLineCost,
  convertBetweenUnits as convertRenderer,
  roundMoney as roundRenderer
} from '../../renderer/src/plugins/restaurant/pages/menu/costing'
import type {
  RecipeLineData,
  RestaurantIngredientData
} from '../../renderer/src/plugins/restaurant/pages/menu/types'
import {
  computePortionCost,
  computeRecipeBatchCost,
  computeRecipeLineCost,
  convertBetweenUnits as convertEngine,
  roundMoney as roundEngine
} from '../../plugins/restaurant/utils/mathEngine'

const ingredient = (
  overrides: Partial<RestaurantIngredientData> & { id: string; unit: string }
): RestaurantIngredientData => ({
  name: overrides.id,
  category: 'Test',
  currentStock: 100,
  minStockAlert: 0,
  costPerUnit: 0,
  ...overrides
})

const line = (ingredientId: string, quantity: number | string, unit: string): RecipeLineData => ({
  ingredientId,
  quantity: String(quantity),
  unit,
  notes: ''
})

/** `computeDishCost` takes a lookup keyed by id, the engine takes joined rows. */
const indexOf = (
  rows: RestaurantIngredientData[]
): Record<string, { unit: string; costPerUnit: number }> =>
  Object.fromEntries(rows.map((row) => [row.id, { unit: row.unit, costPerUnit: row.costPerUnit }]))

const UNITS = ['g', 'kg', 'mg', 'oz', 'lb', 'ml', 'l', 'cl', 'floz', 'pcs', 'can', 'bottle']

describe('restaurant recipe costing parity', () => {
  it('agrees on unit conversion across the supported matrix', () => {
    for (const from of UNITS) {
      for (const to of UNITS) {
        expect(convertRenderer(3, from, to), `${from} -> ${to}`).toBe(convertEngine(3, from, to))
      }
    }
  })

  it('returns the quantity unchanged across unit families', () => {
    // `g` (mass) and `ml` (volume) are not convertible without a density, so both
    // implementations must refuse to guess rather than invent a factor.
    expect(convertRenderer(200, 'g', 'ml')).toBe(200)
    expect(convertEngine(200, 'g', 'ml')).toBe(200)
    expect(convertRenderer(2, 'kg', 'pcs')).toBe(2)
    expect(convertEngine(2, 'kg', 'pcs')).toBe(2)
  })

  it('rounds money identically', () => {
    for (const value of [0, 0.004, 0.005, 1.005, 12.3449, 99.999, 1234.5678]) {
      expect(roundRenderer(value), String(value)).toBe(roundEngine(value))
    }
  })

  it('prices a single line identically', () => {
    for (const lineUnit of UNITS) {
      for (const ingredientUnit of UNITS) {
        for (const costPerUnit of [0, 0.05, 3.75, 18.4]) {
          expect(
            computeLineCost(2.5, lineUnit, ingredientUnit, costPerUnit),
            `${lineUnit} -> ${ingredientUnit} @ ${costPerUnit}`
          ).toBe(computeRecipeLineCost(2.5, lineUnit, ingredientUnit, costPerUnit))
        }
      }
    }
  })

  it('prices a batch and a portion identically to the engine', () => {
    const ingredients = [
      ingredient({ id: 'beef', unit: 'kg', costPerUnit: 18.4 }),
      ingredient({ id: 'bun', unit: 'pcs', costPerUnit: 0.65 }),
      ingredient({ id: 'sauce', unit: 'l', costPerUnit: 6.2 }),
      ingredient({ id: 'cheese', unit: 'g', costPerUnit: 0.012 })
    ]
    const lines = [
      // The regression case: a gram line against a per-kilo ingredient.
      line('beef', 200, 'g'),
      line('bun', 2, 'pcs'),
      line('sauce', 30, 'ml'),
      line('cheese', 40, 'g')
    ]

    const engineBatch = computeRecipeBatchCost(
      lines.map((recipeLine) => {
        const ingredientRow = ingredients.find((row) => row.id === recipeLine.ingredientId)!
        return {
          quantity: Number(recipeLine.quantity),
          unit: recipeLine.unit,
          ingredient: { unit: ingredientRow.unit, costPerUnit: ingredientRow.costPerUnit }
        }
      })
    )

    for (const yieldCount of [1, 2, 4, 10]) {
      const preview = computeDishCost(lines, yieldCount, indexOf(ingredients))
      expect(preview.batchCost, `yield ${yieldCount}`).toBe(engineBatch)
      expect(preview.portionCost, `yield ${yieldCount}`).toBe(
        computePortionCost(engineBatch, yieldCount)
      )
      expect(preview.incomplete).toBe(false)
    }
  })

  it('costs 200g against a per-kg ingredient as 0.2kg, not 200kg', () => {
    const ingredients = [ingredient({ id: 'beef', unit: 'kg', costPerUnit: 20 })]
    const preview = computeDishCost([line('beef', 200, 'g')], 1, indexOf(ingredients))

    expect(preview.batchCost).toBe(4)
    expect(preview.portionCost).toBe(4)
    expect(computeRecipeLineCost(200, 'g', 'kg', 20)).toBe(4)
  })

  it('flags a line it cannot cost instead of silently dropping it', () => {
    const ingredients = [ingredient({ id: 'beef', unit: 'kg', costPerUnit: 20 })]
    const preview = computeDishCost(
      [line('missing', 100, 'g'), line('beef', 100, 'g')],
      1,
      indexOf(ingredients)
    )

    expect(preview.incomplete).toBe(true)
    // The costable line is still priced — the preview never pretends to be zero.
    expect(preview.batchCost).toBe(2)
  })
})
