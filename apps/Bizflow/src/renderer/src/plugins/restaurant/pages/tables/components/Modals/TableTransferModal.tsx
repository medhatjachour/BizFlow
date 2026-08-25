import React, { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'
import { RestaurantTableData, TransferFormData } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  sourceTable: RestaurantTableData | null
  allTables: RestaurantTableData[]
  onTransfer: (data: TransferFormData) => Promise<boolean>
}

export const TableTransferModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sourceTable,
  allTables,
  onTransfer
}) => {
  const [toTableId, setToTableId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !sourceTable) return null

  const availableTables = allTables.filter((t) => t.id !== sourceTable.id && t.status === 'available')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toTableId) return
    setIsSubmitting(true)
    const ok = await onTransfer({ fromTableId: sourceTable.id, toTableId })
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
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Transfer Table</h3>
              <p className="text-xs text-slate-400">Move active order to another table</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 text-xs space-y-1">
          <span className="text-slate-400 block">Source Table:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Table #{sourceTable.number} ({sourceTable.section}) — ${sourceTable.orders?.[0]?.total.toFixed(2) || '0.00'}
          </span>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Destination Table (Available only) *
          </span>
          <select
            required
            value={toTableId}
            onChange={(e) => setToTableId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="">Select an available table...</option>
            {availableTables.map((t) => (
              <option key={t.id} value={t.id}>
                Table #{t.number} ({t.section} • {t.capacity} seats)
              </option>
            ))}
          </select>
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
            disabled={!toTableId || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Transferring...' : 'Transfer Order'}
          </button>
        </div>
      </form>
    </div>
  )
}