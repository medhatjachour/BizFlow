import React from 'react'
import { AlertTriangle, Plus, Edit2, Trash2 } from 'lucide-react'
import { IngredientData } from '../types'
import { formatCurrency, isStockLow } from '../utils'

interface Props {
  ingredient: IngredientData
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

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
        low
          ? 'bg-rose-50/40 dark:bg-slate-800/90 border-rose-300 dark:border-rose-800/60 ring-1 ring-rose-400/20'
          : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:shadow-md'
      }`}
    >
      <div>
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
            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
              In Stock
            </span>
          )}
        </div>

        {/* Stock Metrics */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Current Stock</span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {ingredient.currentStock} {ingredient.unit}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Unit Cost</span>
            <span className="text-base font-black text-slate-700 dark:text-slate-300">
              {formatCurrency(ingredient.costPerUnit)}
            </span>
          </div>
        </div>

        {ingredient.supplierName && (
          <div className="text-[11px] text-slate-400 mt-2 truncate">
            Supplier: <span className="font-semibold text-slate-600 dark:text-slate-300">{ingredient.supplierName}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
        <button
          onClick={() => onAdjustStock(ingredient)}
          className="flex-1 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" /> Restock / Adjust
        </button>

        <button
          onClick={() => onEdit(ingredient)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete(ingredient.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}