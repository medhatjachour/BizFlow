// src/pages/shifts/components/CloseShiftModal.tsx
import React, { useState } from 'react'
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { RestaurantShiftData, CloseShiftFormData } from '../types'
import { formatCurrency, calculateCashDiscrepancy } from '../utils'
import { sounds } from '../../utils/sound'

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
    try {
      sounds.playSuccess()
      const ok = await onCloseShift(shift.id, { endCash, notes })
      if (ok) onClose()
    } catch {
      sounds.playError()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              End Shift & Balance Cash Drawer
            </h3>
            <p className="text-xs text-slate-400">Server: {shift.serverName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expected Cash Ledger Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold">Opening Cash Float:</span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {formatCurrency(shift.startCash)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold">Shift Gross Sales:</span>
            <span className="font-black text-emerald-600">
              {formatCurrency(shift.totalSales)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold">Tips Collected:</span>
            <span className="font-black text-purple-600">
              {formatCurrency(shift.totalTips)}
            </span>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Actual Cash Counted in Drawer ($) *
          </span>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={endCash}
            onChange={(e) => setEndCash(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3.5 py-3 text-lg font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        {/* Real-Time Discrepancy Indicator */}
        {endCash !== '' && (
          <div
            className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between ${
              discrepancy.variance === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : discrepancy.isShort
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                  : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {discrepancy.variance === 0 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>
                {discrepancy.variance === 0
                  ? 'Drawer Perfectly Balanced'
                  : discrepancy.isShort
                    ? `Drawer Short by ${formatCurrency(Math.abs(discrepancy.variance))}`
                    : `Drawer Over by ${formatCurrency(discrepancy.variance)}`}
              </span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Closing Variance Notes / Explanations
          </span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain any drop differences or cash payouts..."
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none font-medium"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || endCash === ''}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-black shadow-md shadow-rose-500/20 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? 'Closing...' : 'Close & Print Z-Report'}
          </button>
        </div>
      </form>
    </div>
  )
}