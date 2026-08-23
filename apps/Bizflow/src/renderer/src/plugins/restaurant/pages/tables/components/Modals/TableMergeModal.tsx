import React, { useState } from 'react'
import { X, GitMerge } from 'lucide-react'
import { RestaurantTableData, MergeFormData } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  sourceTable: RestaurantTableData | null
  allTables: RestaurantTableData[]
  onMerge: (data: MergeFormData) => Promise<boolean>
}

export const TableMergeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sourceTable,
  allTables,
  onMerge
}) => {
  const [targetTableId, setTargetTableId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !sourceTable) return null

  const occupiedTables = allTables.filter(
    (t) => t.id !== sourceTable.id && (t.status === 'occupied' || t.status === 'billing')
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTableId) return
    setIsSubmitting(true)
    const ok = await onMerge({ sourceTableId: sourceTable.id, targetTableId })
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
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Merge Tables</h3>
              <p className="text-xs text-slate-400">Combine check into another active table</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 text-xs space-y-1">
          <span className="text-slate-400 block">Merging Table:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Table #{sourceTable.number} ({sourceTable.orders?.[0]?.items.length || 0} items)
          </span>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Merge Into Table (Target Order) *
          </span>
          <select
            required
            value={targetTableId}
            onChange={(e) => setTargetTableId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="">Select target occupied table...</option>
            {occupiedTables.map((t) => (
              <option key={t.id} value={t.id}>
                Table #{t.number} ({t.section} • Order Total: ${t.orders?.[0]?.total.toFixed(2) || '0.00'})
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
            disabled={!targetTableId || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Merging...' : 'Merge Orders'}
          </button>
        </div>
      </form>
    </div>
  )
}