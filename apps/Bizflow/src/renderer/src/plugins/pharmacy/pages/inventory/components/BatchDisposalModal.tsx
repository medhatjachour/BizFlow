import React from 'react'
import { PackageX, X, AlertTriangle } from 'lucide-react'
import { ExpiringBatchItem, DisposalReason } from '../types'
import { DISPOSAL_REASON_PRESETS } from '../constants'
import { money, inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'

interface BatchDisposalModalProps {
  batch: ExpiringBatchItem | null
  reason: DisposalReason
  customNotes: string
  disposeQty: string
  busy: boolean
  onClose: () => void
  onReasonChange: (r: DisposalReason) => void
  onNotesChange: (n: string) => void
  onQtyChange: (q: string) => void
  onConfirm: () => void
}

export const BatchDisposalModal: React.FC<BatchDisposalModalProps> = ({
  batch,
  reason,
  customNotes,
  disposeQty,
  busy,
  onClose,
  onReasonChange,
  onNotesChange,
  onQtyChange,
  onConfirm,
}) => {
  if (!batch) return null

  const unitCost = batch.costPerUnit || (batch.value / (batch.quantity || 1))
  const parsedQty = parseFloat(disposeQty) || 0
  const writeOffLoss = parsedQty * unitCost

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <PackageX size={17} />
            <h3 className="font-bold text-sm">Write-off & Dispose Batch</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Target Product Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{batch.product?.name}</p>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Batch #{batch.batchNumber || 'N/A'}</span>
              <span>Available: {batch.quantity} {batch.product?.unit}</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              Expiry: {new Date(batch.expiryDate).toLocaleDateString()} ({batch.daysToExpiry < 0 ? 'Already expired' : `${batch.daysToExpiry}d remaining`})
            </p>
          </div>

          {/* Qty & Loss Estimator */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Disposal Quantity</label>
              <span className="text-[11px] text-slate-400">Max: {batch.quantity} {batch.product?.unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={batch.quantity}
                value={disposeQty}
                onChange={e => onQtyChange(e.target.value)}
                className={`${inputCls} font-bold text-slate-900 dark:text-white`}
              />
              <button
                type="button"
                onClick={() => onQtyChange(String(batch.quantity))}
                className="px-2.5 py-2 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                All
              </button>
            </div>
          </div>

          {/* Disposal Reason Preset Grid */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Primary Reason</label>
            <div className="grid grid-cols-2 gap-1.5">
              {DISPOSAL_REASON_PRESETS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onReasonChange(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium border transition-all ${
                    reason === r
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Audit Notes (Optional)</label>
            <input
              value={customNotes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="e.g. Incinerated per local health regulations"
              className={inputCls}
            />
          </div>

          {/* Loss Warning Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <div className="text-[11px] leading-tight">
              Inventory asset loss will be recorded as: <strong className="font-bold">${money(writeOffLoss)}</strong>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              loading={busy}
              disabled={parsedQty <= 0 || parsedQty > batch.quantity}
              onClick={onConfirm}
            >
              Confirm Write-Off
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}