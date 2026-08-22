import { CheckCircle2 } from 'lucide-react'
import { PlanFormData, AmenityKey } from '../../types'
import { AMENITIES } from '../../constants'

interface SectionAmenitiesProps {
  form: PlanFormData
  onToggleAmenity: (key: AmenityKey) => void
  onChange: (key: keyof PlanFormData) => (e: React.ChangeEvent<any>) => void
}

export function SectionAmenities({ form, onToggleAmenity, onChange }: SectionAmenitiesProps) {
  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Check all physical amenities and specialized services bundled into this membership plan:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {AMENITIES.map(a => {
          const Icon = a.icon
          const isChecked = Boolean(form[a.key])

          return (
            <label
              key={a.key}
              onClick={() => onToggleAmenity(a.key)}
              className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                isChecked
                  ? 'border-orange-500 bg-orange-500/10 text-orange-950 dark:text-orange-200'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isChecked ? 'bg-orange-500/20' : 'bg-slate-100 dark:bg-slate-700'
                }`}
              >
                <Icon size={15} className={isChecked ? a.color : 'text-slate-400'} />
              </div>

              <span className="flex-1 text-xs font-bold leading-tight">{a.label}</span>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isChecked
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {isChecked && <CheckCircle2 size={12} />}
              </div>
            </label>
          )
        })}
      </div>

      <div>
        <label className={labelCls}>Complimentary Guest Passes</label>
        <input
          className={inputCls}
          type="number"
          min="0"
          value={form.guestPasses}
          onChange={onChange('guestPasses')}
          placeholder="0"
        />
        <p className="text-[11px] text-slate-400 mt-1">Number of guest invites included with this plan.</p>
      </div>

      <div>
        <label className={labelCls}>Custom Perks & Features (Comma-separated)</label>
        <input
          className={inputCls}
          value={form.features}
          onChange={onChange('features')}
          placeholder="e.g. Free Protein Shake, Reserved Parking, Shaker Bottle"
        />
      </div>
    </div>
  )
}