import React from 'react'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { PosOrderItem } from '../types'
import { ITEM_STATUS_STYLES } from '../constants'
import { formatCurrency, parseModifierSummary } from '../utils'

interface Props {
  item: PosOrderItem
  onUpdateQty: (id: string, qty: number) => void
  onUpdateStatus: (id: string, status: string) => void
}

export const CartItemRow: React.FC<Props> = ({ item, onUpdateQty }) => {
  const statusCfg = ITEM_STATUS_STYLES[item.status] || ITEM_STATUS_STYLES.pending
  const modifiers = parseModifierSummary(item.modifiers)
  const isEditable = item.status === 'pending' || item.status === 'preparing'

  return (
    <div className="py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 transition-all">
      {/* Item Title & Line Total */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
              {item.itemName}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          </div>

          {/* Modifiers & Notes */}
          {modifiers.length > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ↳ {modifiers.join(', ')}
            </div>
          )}
          {item.notes && (
            <div className="text-[10px] text-slate-400 italic">Note: "{item.notes}"</div>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-black text-slate-900 dark:text-white block">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
          <span className="text-[10px] text-slate-400">
            {item.quantity} × {formatCurrency(item.unitPrice)}
          </span>
        </div>
      </div>

      {/* Controls & Course/Status Ribbon */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/40 text-xs">
        {/* Course Badge */}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {item.course}
        </span>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-xl">
          <button
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            disabled={!isEditable}
            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-rose-500" /> : <Minus className="w-3 h-3" />}
          </button>
          <span className="w-6 text-center text-xs font-black text-slate-900 dark:text-white">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            disabled={!isEditable}
            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}