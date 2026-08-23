import React from 'react'
import { Clock, Plus, SlidersHorizontal, Ban } from 'lucide-react'
import { PosMenuItem } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  item: PosMenuItem
  onAddDirect: (item: PosMenuItem) => void
  onConfigureModifiers: (item: PosMenuItem) => void
}

export const MenuItemCard: React.FC<Props> = ({ item, onAddDirect, onConfigureModifiers }) => {
  const hasModifiers = Boolean(item.modifierGroups && item.modifierGroups.length > 0)
  const isOutOfStock = !item.isAvailable

  return (
    <div
      onClick={() => {
        if (isOutOfStock) return
        if (hasModifiers) onConfigureModifiers(item)
        else onAddDirect(item)
      }}
      className={`group relative bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 border transition-all duration-150 flex flex-col justify-between select-none cursor-pointer ${
        isOutOfStock
          ? 'opacity-50 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-not-allowed'
          : 'border-slate-200/80 dark:border-slate-700/70 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 active:scale-98'
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

        {item.description && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 flex items-center gap-1 font-medium">
          <Clock className="w-3 h-3 text-slate-400" />
          {item.preparationTime}m
        </span>

        {isOutOfStock ? (
          <span className="text-rose-500 font-bold flex items-center gap-1">
            <Ban className="w-3 h-3" /> 86'd Out
          </span>
        ) : hasModifiers ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
            <SlidersHorizontal className="w-2.5 h-2.5" /> Options
          </span>
        ) : (
          <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:bg-amber-500 group-hover:text-white text-slate-600 dark:text-slate-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}