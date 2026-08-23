import React from 'react'
import { RotateCcw, X, Check } from 'lucide-react'
import { SaleItem } from '../types'
import { money } from '../../components/_shared'

interface SaleItemRefundRowProps {
  item: SaleItem
  isSaleRefunded: boolean
  isEditing: boolean
  refundQty: string
  busy: boolean
  onStartEditing: () => void
  onCancelEditing: () => void
  onRefundQtyChange: (val: string) => void
  onSubmitRefund: (item: SaleItem, qty: number) => void
}

export const SaleItemRefundRow: React.FC<SaleItemRefundRowProps> = ({
  item,
  isSaleRefunded,
  isEditing,
  refundQty,
  busy,
  onStartEditing,
  onCancelEditing,
  onRefundQtyChange,
  onSubmitRefund,
}) => {
  const refundable = item.quantity - (item.refundedQty ?? 0)
  const parsedQty = Math.max(0, parseFloat(refundQty) || 0)
  const isValid = parsedQty > 0 && parsedQty <= refundable + 0.0001

  return (
    <div className="py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <div className="flex items-center justify-between text-xs">
        <div className="flex-1 min-w-0 pr-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.productName}</span>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {item.quantity} × ${money(item.unitPrice)}
            {(item.refundedQty ?? 0) > 0 && (
              <span className="text-amber-500 font-medium ml-1.5">
                ({item.refundedQty} refunded)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 dark:text-slate-100">${money(item.lineTotal)}</span>
          {!isSaleRefunded && refundable > 0.0001 && !isEditing && (
            <button
              onClick={onStartEditing}
              disabled={busy}
              title="Refund Item"
              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-2 flex items-center gap-1.5 p-2 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl">
          <span className="text-[11px] text-slate-500 shrink-0">Refund Qty:</span>
          <input
            type="number"
            min="1"
            max={refundable}
            value={refundQty}
            onChange={e => onRefundQtyChange(e.target.value)}
            autoFocus
            className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              isValid ? 'border-slate-300 dark:border-slate-700' : 'border-red-500'
            }`}
          />
          <span className="text-[11px] text-slate-400 shrink-0">/ {refundable}</span>
          <button
            onClick={() => onRefundQtyChange(String(refundable))}
            className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded hover:bg-amber-100"
          >
            Max
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onSubmitRefund(item, parsedQty)}
            disabled={busy || !isValid}
            className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1 disabled:opacity-40"
          >
            <Check size={12} /> Confirm
          </button>
          <button onClick={onCancelEditing} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}