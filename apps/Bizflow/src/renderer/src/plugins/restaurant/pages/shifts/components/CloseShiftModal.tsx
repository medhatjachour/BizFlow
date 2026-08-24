import React, { useState } from 'react'
import { X } from 'lucide-react'
import { RestaurantShiftData, CloseShiftFormData } from '../types'
import { formatCurrency, calculateCashDiscrepancy } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  shift: RestaurantShiftData | null
  onCloseShift: (shiftId: string, data: CloseShiftFormData) => Promise<boolean>
}

export const CloseShiftModal: React.FC<Props> = ({ isOpen, onClose, shift, onCloseShift }) => {
  const [endCash, setEndCash] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !shift) return null

  const discrepancy = calculateCashDiscrepancy(shift.startCash, shift.totalSales, Number(endCash || 0))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onCloseShift(shift.id, { endCash, notes })
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            End Shift & Balance Drawer
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expected Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Opening Float:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(shift.startCash)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Shift Sales:</span>
            <span className="font-bold text-emerald-600">
              {formatCurrency(shift.totalSales)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Tips Collected:</span>
            <span className="font-bold text-purple-600">
              {formatCurrency(shift.totalTips)}
            </span>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Actual Cash Counted in Drawer ($) *
          </span>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={endCash}
            onChange={(e) => setEndCash(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2.5 text-lg font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        {/* Discrepancy Alert */}
        {endCash !== '' && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
              discrepancy.variance === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : discrepancy.isShort
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-blue-50 text-blue-700 border-blue-300'
            }`}
          >
            <span>
              {discrepancy.variance === 0
                ? '✅ Drawer Perfectly Balanced'
                : discrepancy.isShort
                  ? `⚠️ Short by ${formatCurrency(Math.abs(discrepancy.variance))}`
                  : `Over by ${formatCurrency(discrepancy.variance)}`}
            </span>
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Closing Notes / Variances</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain any cash differences or drop notes"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
          >
            {isSubmitting ? 'Closing...' : 'Close & Print Z-Report'}
          </button>
        </div>
      </form>
    </div>
  )
}