import React, { useState, useEffect } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { StockEntry } from '../types'

interface Props {
  entry: StockEntry | null
  onClose: () => void
  onConfirm: (id: string, newQty: number, reason: string) => Promise<boolean>
}

export const StockAdjustModal: React.FC<Props> = ({ entry, onClose, onConfirm }) => {
  const [qty, setQty] = useState('0')
  const [reason, setReason] = useState('Manual Cycle Count Audit')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (entry) {
      setQty(String(entry.quantity))
      setReason('Manual Inventory Reconciliation')
    }
  }, [entry])

  if (!entry) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const success = await onConfirm(entry.id, Math.max(0, Number(qty)), reason)
    setSubmitting(false)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Adjust Stock Level</h3>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{entry.productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            New Verified Quantity ({entry.unit})
          </label>
          <input
            type="number"
            min="0"
            required
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-full rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Audit Reason / Notes
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
          >
            <option value="Manual Inventory Reconciliation">Manual Inventory Reconciliation</option>
            <option value="Physical Cycle Count">Physical Cycle Count</option>
            <option value="Damaged / Spoiled Written Off">Damaged / Spoiled Written Off</option>
            <option value="Found Uncounted Stock">Found Uncounted Stock</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Applying...' : 'Apply Adjustment'}
          </button>
        </div>
      </form>
    </div>
  )
}