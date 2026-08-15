import React, { useState, useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { ScheduleItem } from '../types'

interface CompleteModalProps {
  item: ScheduleItem
  onConfirm: (qty: number) => void
  onCancel: () => void
}

export const CompleteModal: React.FC<CompleteModalProps> = ({ item, onConfirm, onCancel }) => {
  const [qty, setQty] = useState(Math.max(1, item.plannedQuantity))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const isInvalid = !Number.isFinite(qty) || qty < 1
  const variance = qty - item.plannedQuantity

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Mark Complete</h3>
              <p className="text-xs text-slate-400 truncate max-w-[180px]">{item.recipe.name}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700/60">
            <span>Planned batches</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {item.plannedQuantity} batches
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Actual Batches Produced
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setQty(q => q + 1)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-lg leading-none"
              >
                +
              </button>
            </div>

            {isInvalid && (
              <p className="text-xs mt-1.5 text-rose-600 dark:text-rose-400">
                Quantity must be at least 1
              </p>
            )}

            {!isInvalid && variance !== 0 && (
              <p
                className={`text-xs mt-2 font-medium ${
                  variance < 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {variance < 0
                  ? `${Math.abs(variance)} batch${Math.abs(variance) !== 1 ? 'es' : ''} short of plan`
                  : `+${variance} batch${variance !== 1 ? 'es' : ''} over plan`}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => !isInvalid && onConfirm(qty)}
            disabled={isInvalid}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm Complete</span>
          </button>
        </div>
      </div>
    </div>
  )
}