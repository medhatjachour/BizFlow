import React, { useState } from 'react'
import { X, UserCheck } from 'lucide-react'
import { RestaurantTableData, QuickSeatFormData } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  table: RestaurantTableData | null
  onSeat: (data: QuickSeatFormData) => Promise<boolean>
}

export const QuickSeatModal: React.FC<Props> = ({ isOpen, onClose, table, onSeat }) => {
  const [guestCount, setGuestCount] = useState<number>(table?.capacity || 2)
  const [serverName, setServerName] = useState('Host Staff')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !table) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onSeat({
      tableId: table.id,
      guestCount,
      serverName,
      notes
    })
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Seat Table #{table.number}
              </h3>
              <p className="text-xs text-slate-400">{table.section}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Number of Guests *</span>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              min="1"
              max="20"
              required
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 font-bold focus:outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Server</span>
          <input
            type="text"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            placeholder="Server name"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Special Seating Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Birthday, high chair required"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
          >
            {isSubmitting ? 'Seating...' : 'Confirm Seating'}
          </button>
        </div>
      </form>
    </div>
  )
}