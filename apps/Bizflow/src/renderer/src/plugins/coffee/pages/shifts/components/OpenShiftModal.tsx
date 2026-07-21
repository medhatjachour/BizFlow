import { X, Loader2, Wallet, FileText, User, Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { OpenForm } from '../types'
import { QUICK_OPEN_AMOUNTS } from '../constants'


interface Props {
  open: boolean
  form: OpenForm
  patchForm: (p: Partial<OpenForm>) => void
  onSubmit: () => void
  onClose: () => void
  saving: boolean
  user: any
}

export function OpenShiftModal({ open, form, patchForm, onSubmit, onClose, saving, user }: Props) {
  if (!open) return null

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

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
              <h3 className="font-bold text-slate-900 dark:text-white">Open New Shift</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Start a new cash drawer session</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="p-5 space-y-5">
          {/* Cashier info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <User size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Cashier</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {user?.fullName ?? user?.username ?? 'Current User'}
              </div>
            </div>
          </div>

          {/* Opening cash */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Opening Cash in Drawer *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.openingCash}
                onChange={(e) => patchForm({ openingCash: e.target.value })}
                placeholder="0.00"
                autoFocus
                className="w-full pl-7 pr-3 py-2.5 text-lg font-semibold border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none tabular-nums"
              />
            </div>
            {/* Quick amounts */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-xs text-slate-400">Quick:</span>
              {QUICK_OPEN_AMOUNTS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => patchForm({ openingCash: String(a) })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    form.openingCash === String(a)
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600'
                  }`}
                >
                  ${a}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Opening Notes (optional)
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                value={form.notes}
                onChange={(e) => patchForm({ notes: e.target.value })}
                placeholder="Drawer condition, handover notes, expected issues..."
                rows={3}
                className={inputCls + ' pl-9 resize-none'}
              />
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs">
              The shift will start now and remain active until you close it. All orders processed during this shift will be linked to it.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
            {saving ? 'Opening…' : 'Open Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}
