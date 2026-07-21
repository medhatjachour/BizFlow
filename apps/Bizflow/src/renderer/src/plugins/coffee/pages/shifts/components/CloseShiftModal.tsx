import {
  X, Loader2, Wallet, FileText, TrendingUp, TrendingDown,
  Check, AlertTriangle, Info,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Shift, CloseForm } from '../types'
import { avgOrdersPerHour, formatMoney, varianceColor } from '../utils'

interface Props {
  open: boolean
  shift: Shift | null
  form: CloseForm
  patchForm: (p: Partial<CloseForm>) => void
  onSubmit: () => void
  onClose: () => void
  saving: boolean
  expectedDrawer: number
  variance: number
}

export function CloseShiftModal({
  open, shift, form, patchForm, onSubmit, onClose, saving, expectedDrawer, variance,
}: Props) {
  if (!open || !shift) return null

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

  const variancePct = expectedDrawer > 0 ? (variance / expectedDrawer) * 100 : 0
  const isBalanced = variance === 0
  const isOver = variance > 0
  const isShort = variance < 0
  const isLargeVariance = expectedDrawer > 0 && Math.abs(variance) > expectedDrawer * 0.05

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Wallet size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Close Shift</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reconcile cash drawer and end the session</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="p-5 space-y-5 overflow-y-auto">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Sales',  value: formatMoney(shift.totalSales) },
              { label: 'Cash Sales',   value: formatMoney(shift.cashTotal) },
              { label: 'Orders/Hour',  value: avgOrdersPerHour(shift) },
              { label: 'Total Orders', value: String(shift.totalOrders) },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Expected drawer calculation */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wide">
              Expected in Drawer
            </div>
            <div className="flex items-center justify-between text-sm text-amber-800 dark:text-amber-300">
              <span>Opening ({formatMoney(shift.openingCash)})</span>
              <span className="text-amber-500">+</span>
              <span>Cash ({formatMoney(shift.cashTotal)})</span>
              <span className="text-amber-500">=</span>
              <span className="font-bold text-base tabular-nums">{formatMoney(expectedDrawer)}</span>
            </div>
          </div>

          {/* Actual cash input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Actual Cash in Drawer *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.closingCash}
                onChange={(e) => patchForm({ closingCash: e.target.value })}
                placeholder="0.00"
                autoFocus
                className="w-full pl-7 pr-3 py-2.5 text-lg font-semibold border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none tabular-nums"
              />
            </div>
            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-400">Quick:</span>
              <button
                type="button"
                onClick={() => patchForm({ closingCash: String(expectedDrawer) })}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-colors"
              >
                Expected
              </button>
              <button
                type="button"
                onClick={() => patchForm({ closingCash: String(Math.round(expectedDrawer)) })}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Round
              </button>
            </div>
          </div>

          {/* Variance visualization */}
          <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Cash Variance
            </div>

            {isBalanced ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400">Balanced</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-500">Drawer matches expected amount</div>
                </div>
              </div>
            ) : isOver ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-blue-700 dark:text-blue-400">
                    Over by {formatMoney(variance)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">
                    ({variancePct.toFixed(1)}%) · More cash than expected
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <TrendingDown size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-red-700 dark:text-red-400">
                    Short by {formatMoney(Math.abs(variance))}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-500">
                    ({Math.abs(variancePct).toFixed(1)}%) · Less cash than expected
                  </div>
                </div>
              </div>
            )}

            {/* Visual comparison bar */}
            {!isBalanced && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Expected</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatMoney(expectedDrawer)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" style={{ width: '100%' }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Actual</span>
                  <span className={`font-semibold tabular-nums ${varianceColor(variance)}`}>
                    {formatMoney(Number(form.closingCash) || 0)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (Number(form.closingCash) / expectedDrawer) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Closing notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Closing Notes (optional)
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                value={form.notes}
                onChange={(e) => patchForm({ notes: e.target.value })}
                placeholder="Cash issues, missing items, summary, remarks..."
                rows={3}
                className={inputCls + ' pl-9 resize-none'}
              />
            </div>
          </div>

          {/* Warning for large variance */}
          {isLargeVariance && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs">
                Large variance detected ({Math.abs(variancePct).toFixed(1)}%). Please verify the cash count and add a note explaining the discrepancy.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
         className="flex items-center gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
            {saving ? 'Closing…' : 'Close Shift'}
          </button>
        </div>
      </div>
      </div>
  )
}
