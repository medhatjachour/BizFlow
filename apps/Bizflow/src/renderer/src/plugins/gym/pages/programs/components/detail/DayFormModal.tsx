import { useState } from 'react'
import { X, Loader2, CalendarPlus } from 'lucide-react'
import { Program, DayFormData } from '../../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DayFormModalProps {
  program: Program
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: DayFormData) => Promise<any>
}

export function DayFormModal({ program, isOpen, onClose, onSubmit }: DayFormModalProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<DayFormData>({
    weekNumber: 1,
    dayNumber: 1,
    name: ''
  })
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <CalendarPlus size={16} className="text-orange-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('gymAddDay') || 'Add Workout Day'}
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
              <label className={labelCls}>{t('gymWeekNumber') || 'Week #'}</label>
              <input
                type="number"
                min="1"
                max={program.weeksTotal || 52}
                className={`${inputCls} font-mono`}
                value={form.weekNumber}
                onChange={e => setForm(f => ({ ...f, weekNumber: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymDayNumber') || 'Day #'}</label>
              <input
                type="number"
                min="1"
                max={7}
                className={`${inputCls} font-mono`}
                value={form.dayNumber}
                onChange={e => setForm(f => ({ ...f, dayNumber: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('gymDayName') || 'Day Focus / Title'}</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Chest & Triceps, Leg Power, Pull Day"
              autoFocus
            />
          </div>

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
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{t('gymAddDay') || 'Save Day'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}