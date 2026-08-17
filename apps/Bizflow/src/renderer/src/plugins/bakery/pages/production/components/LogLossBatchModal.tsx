import React, { useState } from 'react'
import { Flame, X, Loader2 } from 'lucide-react'
import { LOSS_REASONS } from '../constants'
import { ProductionBatch, LossReason } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  batch: ProductionBatch | null
  onClose: () => void
  onConfirmLoss: (payload: {
    batch: ProductionBatch
    quantity: number
    reason: LossReason
    notes?: string
  }) => Promise<void>
}

export const LogLossBatchModal: React.FC<Props> = ({ batch, onClose, onConfirmLoss }) => {

  const [qty, setQty] = useState('')
  const [reason, setReason] = useState<LossReason>('expired')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!batch) return null

  const maxQty = batch.unitsAvailable ?? 0
  const qtyNum = parseFloat(qty) || 0
  const costPerUnit = batch.unitsProduced > 0 ? batch.totalCost / batch.unitsProduced : 0
  const totalCostLost = qtyNum * costPerUnit
  const isValid = qtyNum > 0 && qtyNum <= maxQty

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setSubmitting(true)
    try {
      await onConfirmLoss({
        batch,
        quantity: qtyNum,
        reason,
        notes: notes.trim() || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <h3 className="text-sm font-bold">Log Batch Waste</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Reason
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LOSS_REASONS.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReason(r.key)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                    reason === r.key
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-300'
                  }`}
                >
                  <span className="mr-1">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Lost Quantity ({batch.recipe.yieldUnit}) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              autoFocus
              value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder={`Max: ${maxQty}`}
              className={inputClass}
            />

            {totalCostLost > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex justify-between items-center text-xs">
                <span className="text-rose-700 dark:text-rose-300">Valuation Lost:</span>
                <span className="font-black text-rose-700 dark:text-rose-300">
                  ${formatCurrency(totalCostLost)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Left out overnight…"
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Log Loss</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}