import { Plus, Trash2, TrendingDown, TrendingUp, Loader2 } from 'lucide-react'
import { Measurement, MeasurementFormData } from '../../types'
import { MEASUREMENT_FIELDS } from '../../constants'
import { formatSubDate } from '../../utils'

interface TabMeasurementsProps {
  measurements: Measurement[]
  showForm: boolean
  form: MeasurementFormData
  saving: boolean
  onToggleForm: () => void
  onFormChange: (form: MeasurementFormData) => void
  onSave: () => void
  onDelete: (id: string) => void
}

export function TabMeasurements({
  measurements,
  showForm,
  form,
  saving,
  onToggleForm,
  onFormChange,
  onSave,
  onDelete
}: TabMeasurementsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Body Metrics Timeline
        </span>
        <button
          onClick={onToggleForm}
          className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
        >
          <Plus size={13} />
          <span>{showForm ? 'Cancel' : 'Record Measurement'}</span>
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50/40 dark:bg-orange-950/10 p-4 space-y-3 shadow-inner">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => onFormChange({ ...form, date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5 truncate">
                  {f.label} ({f.unit})
                </label>
                <input
                  type="number"
                  step={f.step}
                  placeholder="—"
                  value={(form as any)[f.key]}
                  onChange={e => onFormChange({ ...form, [f.key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                />
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => onFormChange({ ...form, notes: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>Save Measurement</span>
          </button>
        </div>
      )}

      {measurements.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No body composition metrics recorded yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {measurements.map((m, idx) => {
            const prev = measurements[idx + 1]
            const weightDelta =
              prev && m.weight != null && prev.weight != null ? m.weight - prev.weight : null

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-3.5 group shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/40">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatSubDate(m.date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {weightDelta !== null && (
                      <span
                        className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          weightDelta < 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {weightDelta < 0 ? <TrendingDown size={11} className="mr-0.5" /> : <TrendingUp size={11} className="mr-0.5" />}
                        {weightDelta > 0 ? '+' : ''}
                        {weightDelta.toFixed(1)} kg
                      </span>
                    )}
                    <button
                      onClick={() => onDelete(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                      title="Delete entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center">
                  {[
                    ['Weight', m.weight, 'kg'],
                    ['Body Fat', m.bodyFat, '%'],
                    ['Muscle', m.muscle, 'kg'],
                    ['Waist', m.waist, 'cm'],
                    ['Chest', m.chest, 'cm'],
                    ['Arms', m.arms, 'cm'],
                    ['Legs', m.legs, 'cm']
                  ]
                    .filter(([, v]) => v != null)
                    .map(([lbl, val, unit]) => (
                      <div key={String(lbl)} className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                        <p className="text-[9px] font-semibold text-slate-400 truncate">{lbl}</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {String(val)} <span className="text-[9px] font-normal text-slate-400">{unit}</span>
                        </p>
                      </div>
                    ))}
                </div>

                {m.notes && <p className="mt-2 text-[11px] text-slate-400 italic">“{m.notes}”</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}