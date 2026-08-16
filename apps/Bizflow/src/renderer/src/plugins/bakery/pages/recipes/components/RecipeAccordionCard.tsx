import React from 'react'
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  FileText,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Recipe } from '../types'
import {
  calculateBatchCost,
  calculateCostPerUnit,
  calculateMargin,
  getMarginBadgeClass,
  formatCurrency,
} from '../utils'

interface Props {
  recipe: Recipe
  isOpen: boolean
  onToggle: () => void
  onScaleClick: () => void
  onCardClick: () => void
  onEditClick: () => void
  onDeleteClick: () => void
}

export const RecipeAccordionCard: React.FC<Props> = ({
  recipe,
  isOpen,
  onToggle,
  onScaleClick,
  onCardClick,
  onEditClick,
  onDeleteClick,
}) => {
  const { t } = useLanguage()

  const batchCost = calculateBatchCost(recipe)
  const unitCost = calculateCostPerUnit(recipe)
  const sellPrice = recipe.sellingPrice ?? recipe.outputProduct?.basePrice ?? null
  const margin = calculateMargin(sellPrice, unitCost)
  const marginClass = getMarginBadgeClass(margin)

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 overflow-hidden shadow-sm transition-all hover:shadow-md">
      {/* Header Row */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                {recipe.name}
              </h4>
              {recipe.expiryDays && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
                  {recipe.expiryDays}d expiry
                </span>
              )}
            </div>
            {recipe.description && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{recipe.description}</p>
            )}
          </div>
        </button>

        {/* Metrics Grid */}
        <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
          <div className="text-center">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">Yield</p>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              {recipe.yieldQty} {recipe.yieldUnit}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
              {t('bakeryCostPerUnit') || 'Unit Cost'}
            </p>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              ${unitCost.toFixed(3)}
            </p>
          </div>

          {sellPrice !== null && (
            <div className="text-center">
              <p className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">Sell Price</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                ${formatCurrency(sellPrice)}
              </p>
            </div>
          )}

          {margin !== null && (
            <div className="text-center">
              <p className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">Margin</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black border ${marginClass}`}
              >
                {margin.toFixed(1)}%
              </span>
            </div>
          )}

          {recipe._count && (
            <div className="text-center">
              <p className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">Batches</p>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {recipe._count.productionBatches}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onScaleClick}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title={t('bakeryOpenScalingCalc') || 'Scale Batch'}
          >
            <Calculator className="h-4 w-4" />
          </button>
          <button
            onClick={onCardClick}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            title={t('bakeryRecipeCard') || 'Print Recipe Card'}
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={onEditClick}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDeleteClick}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            title="Archive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable Ingredients Table */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 px-5 py-4 bg-slate-50/50 dark:bg-slate-800/40">
          {recipe.notes && (
            <p className="text-xs text-slate-500 italic mb-3">
              <strong>Notes:</strong> {recipe.notes}
            </p>
          )}

          <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" />
            <span>Formula Ingredients ({recipe.ingredients.length})</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-2.5">{t('bakeryIngredientName') || 'Ingredient'}</th>
                  <th className="px-4 py-2.5 text-right">{t('bakeryIngredientQty') || 'Quantity'}</th>
                  <th className="px-4 py-2.5">{t('bakeryIngredientUnit') || 'Unit'}</th>
                  <th className="px-4 py-2.5 text-right">{t('bakeryCostPerUnit') || 'Cost / Unit'}</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {recipe.ingredients.map((ing, idx) => (
                  <tr key={ing.id ?? idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">{ing.name}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {ing.quantity}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{ing.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500 text-xs">
                      ${Number(ing.costPerUnit).toFixed(3)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      ${(ing.quantity * ing.costPerUnit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60">
                  <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-xs text-slate-500 uppercase tracking-wider">
                    {t('bakeryTotalBatchCost') || 'Total Batch Cost'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-amber-600 dark:text-amber-400 text-sm tabular-nums">
                    ${formatCurrency(batchCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}