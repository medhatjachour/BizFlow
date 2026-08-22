import { CheckCircle2, Star } from 'lucide-react'
import { PlanFormData, PlanColorKey } from '../../types'
import { COLORS } from '../../constants'
import { getPlanColor } from '../../utils'

interface SectionDisplayProps {
  form: PlanFormData
  onSelectColor: (c: PlanColorKey) => void
  onToggleField: (key: 'isPopular' | 'isActive') => void
}

export function SectionDisplay({ form, onSelectColor, onToggleField }: SectionDisplayProps) {
  const col = getPlanColor(form.color)

  return (
    <div className="space-y-4">
      {/* Color Picker */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          Card Theme Color
        </label>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => onSelectColor(c.value)}
              className={`relative w-10 h-10 rounded-2xl ${c.badge} transition-all shadow-xs ${
                form.color === c.value
                  ? 'ring-3 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-400 scale-105'
                  : 'hover:scale-95'
              }`}
              title={c.label}
            >
              {form.color === c.value && (
                <CheckCircle2 size={16} className="absolute inset-0 m-auto text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview Box */}
      <div className={`rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-gradient-to-br ${col.from} ${col.to} p-4.5 shadow-xs`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Realtime Card Preview
        </span>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-black ${col.text}`}>
              ${form.price || '0'}
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
              {form.name || 'Plan Package Name'}
            </p>
            <p className="text-[11px] text-slate-400">{form.durationDays || 30} Days Duration</p>
          </div>
          {form.isPopular && (
            <span
              className={`flex items-center gap-1 text-[10px] font-black text-white px-2.5 py-0.5 rounded-full ${col.badge}`}
            >
              <Star size={9} fill="currentColor" /> POPULAR
            </span>
          )}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2">
        <div
          onClick={() => onToggleField('isPopular')}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              form.isPopular ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            }`}
          >
            <Star size={16} fill={form.isPopular ? 'currentColor' : 'none'} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Featured / Popular Badge</p>
            <p className="text-[11px] text-slate-400">Highlights this plan on the front-facing dashboard</p>
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              form.isPopular ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
            }`}
          >
            {form.isPopular && <CheckCircle2 size={12} />}
          </div>
        </div>

        <div
          onClick={() => onToggleField('isActive')}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              form.isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            }`}
          >
            <CheckCircle2 size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {form.isActive ? 'Active for New Subscriptions' : 'Archived / Inactive'}
            </p>
            <p className="text-[11px] text-slate-400">
              {form.isActive ? 'Visible for members and cashiers' : 'Hidden from new signups'}
            </p>
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              form.isActive ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
            }`}
          >
            {form.isActive && <CheckCircle2 size={12} />}
          </div>
        </div>
      </div>
    </div>
  )
}