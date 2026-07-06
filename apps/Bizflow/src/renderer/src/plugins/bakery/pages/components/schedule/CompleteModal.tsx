import { useState, useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import type { ScheduleItem } from './scheduleTab.types'
import { FIELD_CLS, LABEL_CLS } from './scheduleTab.shared'

interface CompleteModalProps {
  item: ScheduleItem
  onConfirm: (qty: number) => void
  onCancel: () => void
}

export default function CompleteModal({ item, onConfirm, onCancel }: CompleteModalProps) {
  const [qty, setQty] = useState(Math.max(1, item.plannedQuantity))

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const isInvalid = !Number.isFinite(qty) || qty < 1
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Mark Completed</h3>
              <p className="text-xs text-slate-400 mt-0.5">{item.recipe.name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
            <span>Planned batches</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.plannedQuantity}</span>
          </div>
          <div>
            <label className={LABEL_CLS}>Actual quantity produced</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg leading-none"
              >−</button>
              <input
                type="number" min="1"
                value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                className={`${FIELD_CLS} text-center font-semibold`}
              />
              <button
                onClick={() => setQty(q => q + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-lg leading-none"
              >+</button>
            </div>
            {isInvalid && (
              <p className="text-xs mt-1.5 text-red-600 dark:text-red-400">Quantity must be at least 1</p>
            )}
            {!isInvalid && qty !== item.plannedQuantity && (
              <p className={`text-xs mt-1.5 ${qty < item.plannedQuantity ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                {qty < item.plannedQuantity
                  ? `${item.plannedQuantity - qty} short of plan`
                  : `${qty - item.plannedQuantity} over plan`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => !isInvalid && onConfirm(qty)}
            disabled={isInvalid}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> Confirm Complete
          </button>
        </div>
      </div>
    </div>
  )
}
