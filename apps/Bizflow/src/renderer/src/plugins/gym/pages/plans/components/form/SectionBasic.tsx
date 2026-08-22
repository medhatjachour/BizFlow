import { PlanFormData } from '../../types'
import { CATEGORIES, DURATION_PRESETS } from '../../constants'

interface SectionBasicProps {
  form: PlanFormData
  onChange: (key: keyof PlanFormData) => (e: React.ChangeEvent<any>) => void
  onSelectCategory: (cat: string) => void
  onSelectDuration: (days: number) => void
}

export function SectionBasic({ form, onChange, onSelectCategory, onSelectDuration }: SectionBasicProps) {
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="space-y-4">
      {/* Plan Name */}
      <div>
        <label className={labelCls}>Plan Title / Package Name *</label>
        <input
          className={inputCls}
          value={form.name}
          onChange={onChange('name')}
          placeholder="e.g. VIP Platinum All-Inclusive"
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Marketing Description</label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.description}
          onChange={onChange('description')}
          placeholder="Highlight the key benefits for prospective members..."
        />
      </div>

      {/* Category Selection Grid */}
      <div>
        <label className={labelCls}>Target Category</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(c => {
            const Icon = c.icon
            const isSelected = form.category === c.value

            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onSelectCategory(c.value)}
                className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold leading-tight">{c.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{c.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration & Price Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Duration (Days) *</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {DURATION_PRESETS.map(d => (
              <button
                key={d.days}
                type="button"
                onClick={() => onSelectDuration(d.days)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all ${
                  form.durationDays === String(d.days)
                    ? 'border-orange-500 bg-orange-500 text-white shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <input
            className={`${inputCls} font-mono`}
            type="number"
            min="1"
            value={form.durationDays}
            onChange={onChange('durationDays')}
            placeholder="e.g. 30"
            required
          />
        </div>

        <div>
          <label className={labelCls}>Price ($) *</label>
          <input
            className={`${inputCls} font-black tabular-nums mt-6`}
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={onChange('price')}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Freeze Days */}
      <div>
        <label className={labelCls}>Maximum Pause / Freeze Allowance (Days)</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          value={form.maxFreezeDays}
          onChange={onChange('maxFreezeDays')}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Max total days a member can freeze this plan during its lifespan (Set 0 to disallow freezing).
        </p>
      </div>
    </div>
  )
}