import { PlanFormData } from '../../types'

interface SectionSessionsProps {
  form: PlanFormData
  onChange: (key: keyof PlanFormData) => (e: React.ChangeEvent<any>) => void
}

export function SectionSessions({ form, onChange }: SectionSessionsProps) {
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="space-y-4">
      <div className="bg-orange-500/[0.06] border border-orange-500/20 rounded-2xl p-3.5 text-xs text-orange-800 dark:text-orange-300">
        Configure visit frequency limits. Leave blank for <strong>unlimited access</strong>.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Max Visits per Week</label>
          <input
            className={inputCls}
            type="number"
            min="1"
            max="14"
            value={form.sessionsPerWeek}
            onChange={onChange('sessionsPerWeek')}
            placeholder="Unlimited (∞)"
          />
          <p className="text-[11px] text-slate-400 mt-1">e.g. 3 sessions/week</p>
        </div>

        <div>
          <label className={labelCls}>Total Sessions Cap</label>
          <input
            className={inputCls}
            type="number"
            min="1"
            value={form.sessionsTotal}
            onChange={onChange('sessionsTotal')}
            placeholder="Unlimited (∞)"
          />
          <p className="text-[11px] text-slate-400 mt-1">e.g. 12 total visits</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Personal Trainer (PT) Sessions Included</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          value={form.coachSessions}
          onChange={onChange('coachSessions')}
          placeholder="0"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          1-on-1 private coaching sessions included with this package.
        </p>
      </div>

      {/* Live Badge Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/30">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Limits Summary Preview
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Weekly Access', val: form.sessionsPerWeek ? `${form.sessionsPerWeek}/wk` : 'Unlimited' },
            { label: 'Total Visits', val: form.sessionsTotal || 'Unlimited' },
            { label: 'Coach Sessions', val: form.coachSessions || '0' }
          ].map(({ label, val }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{val}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}