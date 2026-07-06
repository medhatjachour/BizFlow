/**
 * ScalingCalculatorModal – Scale recipe ingredients & cost by factor
 */
import { useState } from 'react'
import { X, Calculator } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Ingredient {
  name: string
  quantity: number
  unit: string
  costPerUnit: number
}

interface Recipe {
  id: string
  name: string
  yieldQty: number
  yieldUnit: string
  ingredients: Ingredient[]
}

interface Props {
  recipe: Recipe
  onClose: () => void
}

export default function ScalingCalculatorModal({ recipe, onClose }: Props) {
  const { t } = useLanguage()
  const [factor, setFactor] = useState(1)

  const scaled = recipe.ingredients.map(ing => ({
    ...ing,
    scaledQty: ing.quantity * factor,
    scaledCost: ing.quantity * factor * ing.costPerUnit
  }))

  const totalCost = scaled.reduce((s, i) => s + i.scaledCost, 0)
  const scaledYield = recipe.yieldQty * factor

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('bakeryScalingCalc')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scale factor */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">{t('bakeryScalingMultiplier')} ×</label>
            <input
              type="number" min="0.1" step="0.5"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              value={factor}
              onChange={e => setFactor(Math.max(0.01, Number(e.target.value)))}
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{t('bakeryScaledYield')}</p>
            <p className="text-lg font-bold text-amber-600">{scaledYield.toFixed(2)} {recipe.yieldUnit}</p>
          </div>
        </div>

        {/* Ingredients list */}
        <div className="px-5 py-3 overflow-y-auto max-h-72">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('bakeryScaledIngredients')}</p>
          <div className="space-y-2">
            {scaled.map((ing, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{ing.name}</span>
                  <span className="text-slate-500 ml-2">{ing.scaledQty.toFixed(2)} {ing.unit}</span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 shrink-0">{ing.scaledCost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('bakeryScaledCost')}</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
