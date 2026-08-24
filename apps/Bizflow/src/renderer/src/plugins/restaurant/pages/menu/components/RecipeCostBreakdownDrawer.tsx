// src/pages/menu/components/RecipeCostBreakdownDrawer.tsx
import React from 'react'
import {
  X,
  Utensils,
  DollarSign,
  TrendingUp,
  Percent,
  Package,
  Layers,
  AlertTriangle,
  Edit2
} from 'lucide-react'
import { MenuItemData } from '../types'
import { analyzeDishFinancials, calculateAvailablePortions, formatCurrency } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  item: MenuItemData | null
  onClose: () => void
  onOpenEditRecipe: (item: MenuItemData) => void
}

export const RecipeCostBreakdownDrawer: React.FC<Props> = ({
  item,
  onClose,
  onOpenEditRecipe
}) => {
  if (!item) return null

  const financials = analyzeDishFinancials(item.price, item.cost)
  const { availablePortions, bottleneckIngredient } = calculateAvailablePortions(item)
  const recipe = item.recipe
  const ingredients = recipe?.ingredients || []

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 select-none">
      {/* ─── Drawer Header ─────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {item.name}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                financials.rating === 'high'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : financials.rating === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {financials.costPercent}% Food Cost
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {item.category} • Kitchen Station: {item.station}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Financial Telemetry Strip ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Margin Summary Grid */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Selling Price</span>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {formatCurrency(item.price)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Ingredient Cost</span>
            <span className="text-base font-black text-emerald-600">
              {formatCurrency(item.cost)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Gross Profit</span>
            <span className="text-base font-black text-amber-600">
              +{formatCurrency(financials.profit)}
            </span>
          </div>
        </div>

        {/* Live Inventory Portions Bottleneck Card */}
        {availablePortions !== null ? (
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between ${
              availablePortions === 0
                ? 'bg-rose-50/60 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800'
                : availablePortions <= 5
                  ? 'bg-amber-50/60 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800'
                  : 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black block">
                  {availablePortions === 0
                    ? 'OUT OF STOCK (86)'
                    : `${availablePortions} Portions Can Be Cooked`}
                </span>
                {bottleneckIngredient && availablePortions < 20 && (
                  <span className="text-[10px] opacity-75 block">
                    Bottleneck Raw Material: {bottleneckIngredient}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xl font-black">{availablePortions}</span>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
              No Recipe BOM Configured
            </h4>
            <p className="text-[11px] text-slate-400">
              Link raw ingredients to enable automated pantry stock tracking and dynamic food costing.
            </p>
          </div>
        )}

        {/* Bill of Materials (BOM) Ingredient List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Recipe Ingredients ({ingredients.length})
            </h4>
            {recipe && (
              <span className="text-[10px] font-bold text-slate-400">
                Batch Yield: {recipe.yieldCount} Portion(s)
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-2xs">
            {ingredients.map((ri, idx) => {
              const ing = ri.ingredient
              const itemCost = (ri.quantity / (recipe?.yieldCount || 1)) * (ing?.costPerUnit || 0)
              const costShare = item.cost > 0 ? Math.round((itemCost / item.cost) * 100) : 0

              return (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block">
                      {ing?.name || 'Raw Ingredient'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {ri.quantity} {ri.unit} • In Stock: {ing?.currentStock || 0} {ing?.unit || ri.unit}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 dark:text-white block">
                      ${itemCost.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {costShare}% of cost
                    </span>
                  </div>
                </div>
              )
            })}

            {ingredients.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No ingredients mapped yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Drawer Action Footer ─────────────────────────────────── */}
      <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => {
            sounds.playBump()
            onOpenEditRecipe(item)
          }}
          className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Edit2 className="w-4 h-4" />
          <span>Edit Recipe Bill of Materials (BOM)</span>
        </button>
      </div>
    </div>
  )
}