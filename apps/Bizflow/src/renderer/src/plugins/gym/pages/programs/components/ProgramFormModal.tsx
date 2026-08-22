import { X, Loader2, Dumbbell } from 'lucide-react'
import { Program, CoachLite } from '../types'
import { GOAL_OPTIONS } from '../constants'
import { useProgramForm } from '../hooks/useProgramForm'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ProgramFormModalProps {
  isOpen: boolean
  initial: Program | null
  coaches: CoachLite[]
  onClose: () => void
  onSaved: (program: Program) => void
}

export function ProgramFormModal({
  isOpen,
  initial,
  coaches,
  onClose,
  onSaved
}: ProgramFormModalProps) {
  const { t } = useLanguage()
  const { form, setField, saving, handleSubmit } = useProgramForm(isOpen, initial, onSaved, onClose)

  if (!isOpen) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Dumbbell size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initial ? t('gymEditProgram') || 'Edit Routine' : t('gymNewProgram') || 'Build Training Routine'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>{t('gymProgramName') || 'Program Name'} *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. 12-Week Hypertrophy & Power"
              required
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>{t('gymProgramDescription') || 'Program Overview'}</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Who is this routine designed for? Experience level, goals, equipment..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{t('gymProgramGoal') || 'Target Goal'}</label>
              <select
                className={inputCls}
                value={form.goal}
                onChange={e => setField('goal', e.target.value)}
              >
                {GOAL_OPTIONS.map(g => (
                  <option key={g.value} value={g.value}>
                    {g.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>{t('gymProgramWeeks') || 'Weeks Total'}</label>
              <input
                type="number"
                min="1"
                max="52"
                className={`${inputCls} font-mono`}
                value={form.weeksTotal}
                onChange={e => setField('weeksTotal', e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>{t('gymProgramDaysPerWeek') || 'Days / Week'}</label>
              <input
                type="number"
                min="1"
                max="7"
                className={`${inputCls} font-mono`}
                value={form.daysPerWeek}
                onChange={e => setField('daysPerWeek', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t('gymProgramCoach') || 'Head Coach / Author'}</label>
            <select
              className={inputCls}
              value={form.coachId}
              onChange={e => setField('coachId', e.target.value)}
            >
              <option value="">No Assigned Coach</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.specialty ? `(${c.specialty})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Active Switcher */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
            <input
              type="checkbox"
              id="prog-active"
              checked={form.isActive}
              onChange={e => setField('isActive', e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
            <label htmlFor="prog-active" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              Active Routine — Visible for member assignments
            </label>
          </div>

          {/* Actions */}
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
              <span>{initial ? t('gymSave') || 'Save Changes' : t('gymAddProgram') || 'Create Program'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}