import { Plus, CheckCircle2, Trash2, Target, Loader2 } from 'lucide-react'
import { TraineeGoal, GoalFormData } from '../../types'
import { GOAL_TYPES } from '../../constants'
import { formatSubDate } from '../../utils'

interface TabGoalsProps {
  goals: TraineeGoal[]
  showForm: boolean
  form: GoalFormData
  saving: boolean
  onToggleForm: () => void
  onFormChange: (form: GoalFormData) => void
  onSave: () => void
  onAchieve: (id: string) => void
  onDelete: (id: string) => void
}

export function TabGoals({
  goals,
  showForm,
  form,
  saving,
  onToggleForm,
  onFormChange,
  onSave,
  onAchieve,
  onDelete
}: TabGoalsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Fitness Milestones & Targets
        </span>
        <button
          onClick={onToggleForm}
          className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
        >
          <Plus size={13} />
          <span>{showForm ? 'Cancel' : 'Set New Goal'}</span>
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/40 dark:bg-orange-950/10 p-4 space-y-3 shadow-inner">
          <input
            type="text"
            placeholder="Goal Title (e.g. Bench 100kg, Reach 12% Body Fat)"
            value={form.title}
            onChange={e => onFormChange({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.type}
              onChange={e => onFormChange({ ...form, type: e.target.value as any })}
              className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {GOAL_TYPES.map(gt => (
                <option key={gt.value} value={gt.value}>
                  {gt.label}
                </option>
              ))}
            </select>

            <div className="flex gap-1">
              <input
                type="number"
                placeholder="Target value"
                value={form.targetValue}
                onChange={e => onFormChange({ ...form, targetValue: e.target.value })}
                className="flex-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
              />
              <input
                type="text"
                placeholder="Unit (kg/%)"
                value={form.unit}
                onChange={e => onFormChange({ ...form, unit: e.target.value })}
                className="w-16 px-2 py-2 text-xs text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              placeholder="Target Deadline"
              value={form.deadline}
              onChange={e => onFormChange({ ...form, deadline: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              placeholder="Notes / Motivation"
              value={form.notes}
              onChange={e => onFormChange({ ...form, notes: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <button
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>Add Goal</span>
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No personal goals active for this member yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {goals.map(g => {
            const isAchieved = g.status === 'achieved'
            return (
              <div
                key={g.id}
                className={`rounded-2xl border p-3.5 group relative transition-all ${
                  isAchieved
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isAchieved
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-orange-500/10 text-orange-500'
                      }`}
                    >
                      <Target size={15} />
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isAchieved
                            ? 'text-emerald-800 dark:text-emerald-300 line-through'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {g.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-400 font-medium">
                        <span className="capitalize">{g.type}</span>
                        {g.targetValue != null && (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Target: {g.targetValue} {g.unit || ''}
                          </span>
                        )}
                        {g.deadline && <span>Due: {formatSubDate(g.deadline)}</span>}
                      </div>
                      {g.notes && <p className="text-[10px] text-slate-400 mt-1 italic">“{g.notes}”</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isAchieved && (
                      <button
                        onClick={() => onAchieve(g.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                        title="Mark Complete"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(g.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="Remove Goal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}