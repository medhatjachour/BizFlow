// src/pages/POS/components/SplitCheckModal.tsx
import React, { useState } from 'react'
import { X, GitFork, Users, Check } from 'lucide-react'
import { PosOrder } from '../types'
import { sounds } from '../../utils/sound'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: PosOrder | null
  onSplitBySeats: (selectedSeats: number[]) => Promise<void>
}

export const SplitCheckModal: React.FC<Props> = ({ isOpen, onClose, order, onSplitBySeats }) => {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) return null

  // Extract distinct seats present in current check
  const presentSeats = Array.from(new Set(order.items.filter((i) => i.status !== 'voided').map((i) => i.seatNumber || 1))).sort()

  const handleToggleSeat = (seat: number) => {
    sounds.playBump()
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    )
  }

  const handleExecuteSplit = async () => {
    if (selectedSeats.length === 0 || selectedSeats.length === presentSeats.length) {
      sounds.playError()
      alert('Please select specific seat(s) to separate into a new check.')
      return
    }

    setIsSubmitting(true)
    try {
      sounds.playSuccess()
      await onSplitBySeats(selectedSeats)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate split estimates
  const splitItems = order.items.filter((i) => i.status !== 'voided' && selectedSeats.includes(i.seatNumber || 1))
  const splitSubtotal = splitItems.reduce((s, i) => s + (i.totalPrice || i.unitPrice * i.quantity), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Split Check by Seat</h3>
              <p className="text-xs text-slate-400">Bill #{order.orderNumber || order.id.slice(0, 5)} • Table #{order.table?.number || 'Bar'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            Select Seats to Separate onto New Check:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {presentSeats.map((seat) => {
              const isSelected = selectedSeats.includes(seat)
              const count = order.items.filter((i) => i.status !== 'voided' && (i.seatNumber || 1) === seat).length

              return (
                <button
                  key={seat}
                  type="button"
                  onClick={() => handleToggleSeat(seat)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600 ring-2 ring-purple-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 text-sm font-black">
                    <Users className="w-3.5 h-3.5" /> Seat {seat}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{count} item(s)</span>
                  {isSelected && <Check className="w-4 h-4 text-purple-500 mt-1" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Estimate Card */}
        {selectedSeats.length > 0 && (
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs flex justify-between items-center">
            <span className="font-bold text-purple-900 dark:text-purple-300">
              New Check Total (Approx):
            </span>
            <span className="text-base font-black text-purple-700 dark:text-purple-400">
              ${splitSubtotal.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedSeats.length === 0 || isSubmitting}
            onClick={handleExecuteSplit}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? 'Separating...' : 'Create Separate Check'}
          </button>
        </div>
      </div>
    </div>
  )
}