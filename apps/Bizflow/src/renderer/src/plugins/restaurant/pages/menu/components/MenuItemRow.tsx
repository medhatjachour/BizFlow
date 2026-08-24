import React from 'react'
import {
  Clock,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
} from 'lucide-react'
import { MenuItemData } from '../types'
import { calculateGrossMargin, formatCurrency } from '../utils'

interface Props {
  item: MenuItemData
  onToggle86: (id: string) => void
  onEdit: (item: MenuItemData) => void
  onDelete: (id: string) => void
}

export const MenuItemRow: React.FC<Props> = ({ item, onToggle86, onEdit, onDelete }) => {
  const margin = calculateGrossMargin(item.price, item.cost)
  const modifierCount = item.modifierGroups?.length || 0

  return (
    <div
      className={`group p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
        item.isAvailable
          ? 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/60 hover:shadow-md'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
      }`}
    >
      {/* Left: Dish Name, Description, Station & Modifiers */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
            {item.name}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
            {item.station || 'Kitchen'}
          </span>
          {modifierCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
              <SlidersHorizontal className="w-2.5 h-2.5" />
              {modifierCount} Option Groups
            </span>
          )}
          {!item.isAvailable && (
            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase">
              86'd Out of Stock
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.description}</p>
        )}

        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {item.preparationTime}m prep
          </span>
          <span>•</span>
          <span>Cost: {formatCurrency(item.cost)}</span>
        </div>
      </div>

      {/* Center: Financials & Gross Margin Badge */}
      <div className="text-right shrink-0">
        <div className="text-base font-black text-slate-900 dark:text-white">
          {formatCurrency(item.price)}
        </div>
        <div
          className={`text-[10px] font-black uppercase tracking-wider ${
            margin.rating === 'high'
              ? 'text-emerald-600 dark:text-emerald-400'
              : margin.rating === 'medium'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {margin.marginPercent}% Margin (+{formatCurrency(margin.profit)})
        </div>
      </div>

      {/* Right: Actions (86 Toggle, Edit, Delete) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onToggle86(item.id)}
          className={`p-1.5 rounded-xl transition-colors ${
            item.isAvailable
              ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title={item.isAvailable ? 'Click to 86 (Mark Out of Stock)' : 'Click to Make Available'}
        >
          {item.isAvailable ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
        </button>

        <button
          onClick={() => onEdit(item)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Edit item"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title="Delete item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}