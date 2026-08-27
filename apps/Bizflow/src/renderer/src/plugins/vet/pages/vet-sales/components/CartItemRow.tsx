import React from 'react'
import { Minus, Plus, Pencil, Trash2 } from 'lucide-react'
import type { CartItem } from '../types'

interface Props {
  item: CartItem
  onEdit: () => void
  onRemove: () => void
  onAdjustQty: (delta: number) => void
}

export const CartItemRow: React.FC<Props> = ({ item, onEdit, onRemove, onAdjustQty }) => {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unitPrice) || 0
  const disc = parseFloat(item.discount) || 0
  const lineTotal = Math.max(0, qty * price - disc)
  const unitLabel = item.saleUnit === 'sub' ? (item.medicine.subUnit ?? 'sub') : item.medicine.unit

  return (
    <div className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-violet-300 dark:hover:border-violet-800 transition-all space-y-2">
      {/* Upper Line: Name & Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-tight truncate">
            {item.medicine.name}
          </h5>
          <span className="text-[10px] text-slate-400 font-mono">
            Lot: {item.batch.batchNumber || 'Default'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Lower Line: Stepper + Price Breakdown */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onAdjustQty(-1)}
            className="px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Minus size={11} />
          </button>
          <span className="px-2 text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => onAdjustQty(1)}
            className="px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs font-black text-slate-900 dark:text-white">
            ${lineTotal.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400">
            {unitLabel} @ ${price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}