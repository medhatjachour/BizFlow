import { useState } from 'react'
import { X, Loader2, Dumbbell } from 'lucide-react'
import { ProgramDay, ExerciseFormData } from '../../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ExerciseFormModalProps {
  day: ProgramDay | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (dayId: string, data: ExerciseFormData) => Promise<any>
}

export function ExerciseFormModal({ day, isOpen, onClose, onSubmit }: ExerciseFormModalProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<ExerciseFormData>({
    name: '',
    sets: '3',
    reps: '10',
    weight: '',
    restSec: '60',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  if (!isOpen || !day) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    try {
      await onSubmit(day.id, form)
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
            <Dumbbell size={16} className="text-orange-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('gymAddExercise') || 'Add Exercise'}
              </h3>
              <p className="text-xs text-slate-400">
                Week {day.weekNumber} · Day {day.dayNumber} {day.name ? `(${day.name})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className={labelCls}>{t('gymExerciseName') || 'Exercise Name'} *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Incline Dumbbell Press"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>{t('gymSets') || 'Sets'}</label>
              <input
                type="number"
                min="1"
                className={`${inputCls} font-mono`}
                value={form.sets}
                onChange={e => setForm(f => ({ ...f, sets: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymReps') || 'Reps / Duration'}</label>
              <input
                className={`${inputCls} font-mono`}
                value={form.reps}
                onChange={e => setForm(f => ({ ...f, reps: e.target.value }))}
                placeholder="10-12, AMRAP"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>{t('gymWeight') || 'Target Weight'}</label>
              <input
                className={inputCls}
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                placeholder="e.g. 75kg, RPE 8"
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymRest') || 'Rest (Sec)'}</label>
              <input
                type="number"
                min="0"
                step="5"
                className={`${inputCls} font-mono`}
                value={form.restSec}
                onChange={e => setForm(f => ({ ...f, restSec: e.target.value }))}
                placeholder="60"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('gymNotes') || 'Execution & Form Cues'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="3s eccentric, slow lockout, squeeze at peak..."
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
              disabled={saving || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{t('gymAddExercise') || 'Add Exercise'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}