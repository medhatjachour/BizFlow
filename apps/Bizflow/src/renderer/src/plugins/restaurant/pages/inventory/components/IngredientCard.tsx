// src/pages/inventory/components/IngredientCard.tsx
import React from 'react'
import { AlertTriangle, Plus, Edit2, Trash2, Utensils } from 'lucide-react'
import { IngredientData } from '../types'
import { formatCurrency, isStockLow } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  ingredient: IngredientData & { recipeUsages?: Array<{ recipe: { menuItem: { name: string } } }> }
  onAdjustStock: (ing: IngredientData) => void
  onEdit: (ing: IngredientData) => void
  onDelete: (id: string) => void
}

export const IngredientCard: React.FC<Props> = ({
  ingredient,
  onAdjustStock,
  onEdit,
  onDelete
}) => {
  const low = isStockLow(ingredient.currentStock, ingredient.minStockAlert)
  const linkedDishes = ingredient.recipeUsages?.map((u) => u.recipe?.menuItem?.name).filter(Boolean) || []

  return (
    <div
      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
        low
          ? 'bg-rose-50/40 dark:bg-slate-900 border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-500/20'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-black text-slate-900 dark:text-white block">
              {ingredient.name}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {ingredient.category}
            </span>
          </div>

          {low ? (
            <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-black text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
              In Stock
            </span>
          )}
        </div>

        {/* Stock Numbers */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Current Stock</span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {ingredient.currentStock} {ingredient.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Unit Cost</span>
            <span className="text-base font-black text-emerald-600">
              {formatCurrency(ingredient.costPerUnit)}
            </span>
          </div>
        </div>

        {/* Linked Recipe Usages */}
        {linkedDishes.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-400 font-bold flex items-center gap-1 mb-1">
              <Utensils className="w-3 h-3 text-amber-500" /> Used in {linkedDishes.length} Dishes:
            </span>
            <div className="flex flex-wrap gap-1">
              {linkedDishes.slice(0, 3).map((dish) => (
                <span
                  key={dish}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                >
                  {dish}
                </span>
              ))}
              {linkedDishes.length > 3 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  +{linkedDishes.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => {
            sounds.playBump()
            onAdjustStock(ingredient)
          }}
          className="flex-1 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Restock / Adjust
        </button>

        <button
          type="button"
          onClick={() => onEdit(ingredient)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(ingredient.id)}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}