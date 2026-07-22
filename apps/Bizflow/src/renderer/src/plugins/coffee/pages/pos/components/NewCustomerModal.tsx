import { X, UserPlus, Loader2, User, Phone, Mail } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { NewCustomerForm } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  form: NewCustomerForm
  patchForm: (p: Partial<NewCustomerForm>) => void
  onSave: () => void
  saving: boolean
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

export function NewCustomerModal({ open, onClose, form, patchForm, onSave, saving }: Props) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Customer</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a new customer record</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={e => { e.preventDefault(); onSave() }} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              {t('cfCheckoutCustomerNM')||"Customer Name"}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.name}
                onChange={e => patchForm({ name: e.target.value })}
                placeholder="Customer name"
                autoFocus
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              {t('cfCheckoutCustomerPH')||"Phone"} ({t('cfOptional')||"Optional"})
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.phone}
                onChange={e => patchForm({ phone: e.target.value })}
                placeholder="01x..."
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              {t('cfCheckoutCustomerADDR')||"Address"} ({t('cfOptional')||"Optional"})
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={form.address}
                onChange={e => patchForm({ address: e.target.value })}
                placeholder="address@example.com"
                className={inputCls + ' pl-9'}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
