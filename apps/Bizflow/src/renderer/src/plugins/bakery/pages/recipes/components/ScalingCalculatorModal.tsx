import React, { useState } from 'react'
import { X, Calculator } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { SCALING_PRESETS } from '../constants'
import { Recipe } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  recipe: Recipe | null
  onClose: () => void
}

export const ScalingCalculatorModal: React.FC<Props> = ({ recipe, onClose }) => {
  const { t } = useLanguage()
  const [factor, setFactor] = useState(1)

  if (!recipe) return null

  const scaledIngredients = recipe.ingredients.map(ing => ({
    ...ing,
    scaledQty: (ing.quantity || 0) * factor,
    scaledCost: (ing.quantity || 0) * factor * (ing.costPerUnit || 0),
  }))

  const totalCost = scaledIngredients.reduce((sum, ing) => sum + ing.scaledCost, 0)
  const scaledYield = (recipe.yieldQty || 0) * factor

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('bakeryScalingCalc') || 'Recipe Batch Scaler'}
              </h3>
              <p className="text-xs text-slate-400">{recipe.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Multiplier Stepper */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {t('bakeryScaledYield') || 'Target Output'}
              </p>
              <p className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
                {scaledYield.toFixed(1)} {recipe.yieldUnit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Total Scaled Cost
              </p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                ${formatCurrency(totalCost)}
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Batch Scale Factor
            </label>
            <div className="flex gap-1.5 mb-2">
              {SCALING_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFactor(preset)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    factor === preset
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-300'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>

            <input
              type="number"
              min="0.01"
              step="any"
              value={factor}
              onChange={e => setFactor(Math.max(0.01, Number(e.target.value)))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Scaled Ingredients Table */}
          <div className="overflow-y-auto max-h-60 rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2">Ingredient</th>
                  <th className="px-3 py-2 text-right">Scaled Qty</th>
                  <th className="px-3 py-2 text-right">Scaled Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {scaledIngredients.map((ing, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">
                      {ing.name}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {ing.scaledQty.toFixed(2)} {ing.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ${formatCurrency(ing.scaledCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}