import { X, Loader2, Lock } from 'lucide-react'
import { Locker, LockerZone } from '../types'
import { LOCKER_ZONES } from '../constants'
import { useLockerForm } from '../hooks/useLockerForm'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface LockerFormModalProps {
  isOpen: boolean
  initial: Locker | null
  onClose: () => void
  onSaved: () => void
}

export function LockerFormModal({ isOpen, initial, onClose, onSaved }: LockerFormModalProps) {
  const { t } = useLanguage()
  const { form, setField, saving, handleSubmit } = useLockerForm(isOpen, initial, onSaved, onClose)

  if (!isOpen) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Lock size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initial ? t('gymEditLocker') || 'Edit Locker Unit' : t('gymAddLocker') || 'Add New Locker Unit'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymLockerNumber') || 'Locker Number'} *</label>
              <input
                className={inputCls}
                value={form.number}
                onChange={e => setField('number', e.target.value)}
                placeholder="e.g. A-104"
                required
                disabled={Boolean(initial)}
                autoFocus={!initial}
              />
            </div>

            <div>
              <label className={labelCls}>{t('gymLockerZone') || 'Zone Area'}</label>
              <select
                className={inputCls}
                value={form.zone}
                onChange={e => setField('zone', e.target.value as LockerZone)}
              >
                {LOCKER_ZONES.map(z => (
                  <option key={z.value} value={z.value}>
                    {t(z.labelKey) || z.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('gymNotes') || 'Internal Notes'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="e.g. Top tier shelf, electronic keypad..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('gymCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{initial ? t('gymSave') || 'Save Changes' : t('gymAddLocker') || 'Create Locker'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}