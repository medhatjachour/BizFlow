import React from 'react'
import {  Edit2, Trash2 } from 'lucide-react'
import { MenuItemRecipeData } from '../types'

interface Props {
  recipe: MenuItemRecipeData
  onEdit: (recipe: MenuItemRecipeData) => void
  onDelete: (id: string) => void
}

export const RecipeCard: React.FC<Props> = ({ recipe, onEdit, onDelete }) => {
  const totalCost = recipe.ingredients.reduce((acc, item) => {
    const cost = item.ingredient?.costPerUnit || 0
    return acc + item.quantity * cost
  }, 0)
  const portionCost = totalCost / (recipe.yieldCount || 1)
  const sellingPrice = recipe.menuItem?.price || 0
  const foodCostPercent = sellingPrice > 0 ? Math.round((portionCost / sellingPrice) * 100) : 0

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              {recipe.menuItem?.name || 'Recipe'}
            </h4>
            <span className="text-xs text-slate-400 font-semibold">
              {recipe.menuItem?.category} • Yield: {recipe.yieldCount} Portion(s)
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              foodCostPercent <= 30
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : foodCostPercent <= 40
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {foodCostPercent}% Food Cost
          </span>
        </div>

        {/* Cost & Margin Strip */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Selling Price</span>
            <span className="font-black text-slate-900 dark:text-white">${sellingPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Recipe Cost</span>
            <span className="font-black text-emerald-600">${portionCost.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Gross Profit</span>
            <span className="font-black text-amber-600">
              +${Math.max(0, sellingPrice - portionCost).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Ingredient Breakdown */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Bill of Materials ({recipe.ingredients.length} ingredients)
          </span>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {recipe.ingredients.map((ing, idx) => (
              <div key={idx} className="py-1.5 flex justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {ing.quantity} {ing.unit} {ing.ingredient?.name}
                </span>
                <span className="text-slate-400">
                  ${((ing.ingredient?.costPerUnit || 0) * ing.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
        <button
          onClick={() => onEdit(recipe)}
          className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit Recipe BOM
        </button>
        <button
          onClick={() => onDelete(recipe.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors ml-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}