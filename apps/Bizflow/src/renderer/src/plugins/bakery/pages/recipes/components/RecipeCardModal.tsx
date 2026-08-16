import React from 'react'
import { X, Printer } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Recipe } from '../types'
import { calculateBatchCost, calculateCostPerUnit, formatCurrency } from '../utils'

interface Props {
  recipe: Recipe | null
  onClose: () => void
}

export const RecipeCardModal: React.FC<Props> = ({ recipe, onClose }) => {
  const { t } = useLanguage()

  if (!recipe) return null

  const totalCost = calculateBatchCost(recipe)
  const costPerUnit = calculateCostPerUnit(recipe)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div
        id="recipe-card-print"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 print:border-none print:shadow-none print:max-w-none print:w-full"
      >
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('bakeryRecipeCard') || 'Recipe Card'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t('bakeryPrintRecipe') || 'Print Card'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 space-y-4 print:text-black">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white print:text-black">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="text-slate-500 text-sm mt-1">{recipe.description}</p>
            )}
          </div>

          <div className="flex gap-3 text-xs">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl px-3 py-2 print:border-amber-300">
              <p className="font-semibold text-amber-700 uppercase tracking-wide">Yield</p>
              <p className="text-base font-bold text-amber-900">
                {recipe.yieldQty} {recipe.yieldUnit}
              </p>
            </div>
            {recipe.expiryDays && (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-3 py-2 print:border-slate-300">
                <p className="font-semibold text-slate-500 uppercase tracking-wide">Shelf Life</p>
                <p className="text-base font-bold text-slate-800">
                  {recipe.expiryDays} days
                </p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              {t('bakeryIngredients') || 'Ingredients'}
            </h4>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 font-bold text-slate-500 uppercase">
                  <th className="pb-1.5">Ingredient</th>
                  <th className="pb-1.5 text-right">Quantity</th>
                  <th className="pb-1.5 text-right">Cost/Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipe.ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="py-2 font-semibold text-slate-900">{ing.name}</td>
                    <td className="py-2 text-right font-medium text-slate-700">
                      {ing.quantity} {ing.unit}
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      ${Number(ing.costPerUnit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={2} className="pt-2 font-bold text-slate-700">
                    Total Formula Cost
                  </td>
                  <td className="pt-2 text-right font-black text-amber-600">
                    ${formatCurrency(totalCost)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="text-slate-500">
                    Cost per {recipe.yieldUnit}
                  </td>
                  <td className="text-right text-slate-700 font-bold">
                    ${costPerUnit.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {recipe.notes && (
            <div className="border-t border-slate-100 pt-3">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Baking & Process Instructions
              </h5>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {recipe.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}