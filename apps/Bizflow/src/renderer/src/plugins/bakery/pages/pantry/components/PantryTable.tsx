    import React from 'react'
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PantryIngredient } from '../types'
import { formatCurrency, formatQuantity, isLowStock, needsReorder } from '../utils'

interface Props {
  items: PantryIngredient[]
  loading: boolean
  onAdjustClick: (item: PantryIngredient) => void
  onReorderClick: (item: PantryIngredient) => void
  onEditClick: (item: PantryIngredient) => void
  onDeleteClick: (id: string) => void
}

export const PantryTable: React.FC<Props> = ({
  items,
  loading,
  onAdjustClick,
  onReorderClick,
  onEditClick,
  onDeleteClick,
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs">{t('bakeryLoadingPantry') || 'Loading pantry inventory…'}</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/30 px-6">
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
          <Package className="h-8 w-8" />
        </div>
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">
          {t('bakeryNoPantryItems') || 'No pantry ingredients found'}
        </p>
        <p className="text-xs mt-1 text-slate-400 max-w-sm">
          {t('bakeryNoPantryDesc') ||
            'Add raw baking ingredients to track stocks, costs, and automate recipe ingredient deductions.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3.5">{t('bakeryIngredientStockName') || 'Ingredient'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryCurrentStock') || 'Current Stock'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryPantryCostPerUnit') || 'Cost / Unit'}</th>
              <th className="px-4 py-3.5 text-right">{t('bakeryPantryTotalValuation') || 'Stock Value'}</th>
              <th className="px-4 py-3.5">{t('bakerySupplierName') || 'Supplier'}</th>
              <th className="px-4 py-3.5 text-center">{t('bakeryScheduleStatus') || 'Status'}</th>
              <th className="px-4 py-3.5 text-center">{t('bakeryLinkedRecipes') || 'Recipes'}</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {items.map(item => {
              const isLow = isLowStock(item)
              const reorder = needsReorder(item)
              const totalVal = (item.currentStock || 0) * (item.costPerUnit || 0)

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/75 dark:hover:bg-slate-700/20 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                    {item.notes && (
                      <p className="text-xs text-slate-400 italic truncate max-w-xs mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">
                    {formatQuantity(item.currentStock, item.unit)}
                  </td>

                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                    ${formatCurrency(item.costPerUnit)}
                  </td>

                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${formatCurrency(totalVal)}
                  </td>

                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                    {item.supplierName || '—'}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isLow
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                        }`}
                      >
                        {isLow && <AlertTriangle className="h-3 w-3" />}
                        {isLow
                          ? t('bakeryLowStock') || 'Low Stock'
                          : t('bakeryInStock') || 'Optimal'}
                      </span>

                      {reorder && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                          <ShoppingCart className="h-2.5 w-2.5" />
                          {t('bakeryNeedsReorder') || 'Reorder Point'}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center text-xs font-medium text-slate-500">
                    {item._count?.recipeIngredients ?? 0}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {reorder && (
                        <button
                          onClick={() => onReorderClick(item)}
                          title={t('bakeryMarkReordered') || 'Receive delivery'}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onAdjustClick(item)}
                        title={t('bakeryAdjustStock') || 'Adjust stock level'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onEditClick(item)}
                        title={t('bakeryEditIngredientStock') || 'Edit ingredient details'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onDeleteClick(item.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}