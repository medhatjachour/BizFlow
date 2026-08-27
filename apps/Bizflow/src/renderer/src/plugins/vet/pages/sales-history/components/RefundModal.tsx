import React, { useState } from 'react'
import { RotateCcw, Loader2, Minus, Plus } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import type { RefundTarget } from '../types'

interface Props {
  target: RefundTarget
  onClose: () => void
  onDone: () => void
}

export const RefundModal: React.FC<Props> = ({ target, onClose, onDone }) => {
  const toast = useToast()
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const isGroup = target.kind === 'group'
  const sale = !isGroup ? target.sale : null
  const refundableQty = sale ? Math.max(0, sale.quantity - (sale.refundedQty ?? 0)) : 0
  const unitLabel = sale
    ? sale.saleUnit === 'sub' && sale.medicine.subUnit
      ? sale.medicine.subUnit
      : sale.medicine.unit
    : ''

  const [qtyStr, setQtyStr] = useState(() => String(refundableQty))
  const qty = Math.max(0, parseFloat(qtyStr) || 0)
  const qtyValid = !sale || (qty > 0 && qty <= refundableQty + 0.0001)

  const refundAmount = isGroup
    ? Math.max(0, target.group.total - (target.group.refunded ?? 0))
    : sale && sale.quantity > 0
    ? Math.round((qty / sale.quantity) * sale.totalPrice * 100) / 100
    : 0

  const handleConfirm = async () => {
    if (!qtyValid) return
    setBusy(true)
    try {
      if (isGroup) {
        const res = await (window as any).api?.vet?.medicines?.refundSaleGroup(
          target.group.groupKey,
          { reason: reason || undefined }
        )
        toast.success(`Refunded $${(res?.totalRefund ?? refundAmount).toFixed(2)}`)
      } else {
        const res = await (window as any).api?.vet?.medicines?.refundSale(target.sale.id, {
          quantity: qty,
          reason: reason || undefined
        })
        toast.success(`Refunded $${(res?.refundAmount ?? refundAmount).toFixed(2)}`)
      }
      onDone()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Refund processing failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isGroup ? 'Refund Transaction' : 'Refund Line Item'}
            </h3>
            <p className="text-xs text-slate-400">
              {isGroup ? `${target.group.itemCount} items in receipt` : sale?.medicine.name}
            </p>
          </div>
        </div>

        {/* Single Item Partial Stepper */}
        {sale && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              Quantity to Return ({unitLabel})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQtyStr(String(Math.max(1, qty - 1)))}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min="0.01"
                step="any"
                value={qtyStr}
                onChange={e => setQtyStr(e.target.value)}
                className={`${INPUT_BASE_CLS} text-center font-bold`}
              />
              <button
                type="button"
                onClick={() => setQtyStr(String(Math.min(refundableQty, qty + 1)))}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 space-y-1">
          <div className="flex justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
            <span>Payable Refund Total:</span>
            <span className="text-sm">${refundAmount.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Stock items will be automatically re-allocated back to batch inventory.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            Reason for Return (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Expired batch or patient cancellation"
            className={INPUT_BASE_CLS}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !qtyValid}
            onClick={handleConfirm}
            className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  )
}