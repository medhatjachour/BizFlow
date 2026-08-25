// src/pages/POS/components/MenuItemCard.tsx
import React from 'react'
import { Clock, Plus, SlidersHorizontal, Ban, Package } from 'lucide-react'
import { PosMenuItem } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  item: PosMenuItem & { recipe?: any }
  onAddDirect: (item: PosMenuItem) => void
  onConfigureModifiers: (item: PosMenuItem) => void
}

export const MenuItemCard: React.FC<Props> = ({ item, onAddDirect, onConfigureModifiers }) => {
  const hasModifiers = Boolean(item.modifierGroups && item.modifierGroups.length > 0)

  // Compute live remaining portions from linked recipe BOM
  let availablePortions: number | null = null
  if (item.recipe?.ingredients?.length) {
    let minPortions = Infinity
    for (const ri of item.recipe.ingredients) {
      const stock = ri.ingredient?.currentStock || 0
      const needed = ri.quantity / (item.recipe.yieldCount || 1)
      if (needed > 0) {
        minPortions = Math.min(minPortions, Math.floor(stock / needed))
      }
    }
    if (minPortions !== Infinity) availablePortions = Math.max(0, minPortions)
  }

  const isOutOfStock = !item.isAvailable || (availablePortions !== null && availablePortions <= 0)

  return (
    <div
      onClick={() => {
        if (isOutOfStock) return
        if (hasModifiers) onConfigureModifiers(item)
        else onAddDirect(item)
      }}
      className={`group relative bg-white dark:bg-slate-900 rounded-3xl p-3.5 border transition-all duration-150 flex flex-col justify-between select-none cursor-pointer ${
        isOutOfStock
          ? 'opacity-50 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-not-allowed'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-amber-400 hover:shadow-md active:scale-98'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-1.5">
          <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight line-clamp-2">
            {item.name}
          </h4>
          <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
            {formatCurrency(item.price)}
          </span>
        </div>

        {/* Live Portions Countdown Badge */}
        {availablePortions !== null && (
          <div className="mt-1">
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                availablePortions === 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : availablePortions <= 5
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Package className="w-2.5 h-2.5" />
              {availablePortions === 0 ? '0 left (86)' : `${availablePortions} left in pantry`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1 font-bold">
          <Clock className="w-3 h-3 text-slate-400" />
          {item.preparationTime}m
        </span>

        {isOutOfStock ? (
          <span className="text-rose-500 font-black flex items-center gap-1 text-[10px]">
            <Ban className="w-3 h-3" /> 86'd
          </span>
        ) : hasModifiers ? (
          <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black text-[10px] flex items-center gap-1">
            <SlidersHorizontal className="w-2.5 h-2.5" /> Options
          </span>
        ) : (
          <span className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-500 group-hover:text-white text-slate-600 dark:text-slate-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}