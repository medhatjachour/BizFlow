// sessions/components/sessionForm/PrescriptionsSection.tsx
import { Plus, Settings2, Trash2, Pill } from 'lucide-react'
import SuggestInput from '../../../components/SuggestInput'
import { PrescriptionItem } from '../types'
import { emptyRx } from '../utils'

interface Props {
  prescriptions: PrescriptionItem[]
  onChange: React.Dispatch<React.SetStateAction<PrescriptionItem[]>>
  allMedicines: string[]
  onManageMedicines: () => void
}

export default function PrescriptionsSection({ prescriptions, onChange, allMedicines, onManageMedicines }: Props) {
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Prescription Medications</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onManageMedicines} className="text-xs text-teal-600 hover:underline flex items-center gap-1 font-semibold">
            <Settings2 className="h-3 w-3" /> Preset Drugs
          </button>
          <button
            type="button"
            onClick={() => onChange(prev => [...prev, emptyRx()])}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Medication
          </button>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6 italic">No medications prescribed yet.</p>
      ) : (
        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {prescriptions.map((rx, idx) => (
            <div key={idx} className="pt-3 first:pt-0 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Drug Name *</label>
                  <SuggestInput
                    className={inputCls}
                    suggestions={allMedicines}
                    value={rx.medicineName}
                    onChange={v => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, medicineName: v } : item)))}
                    placeholder="e.g. Amoxicillin"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Dosage</label>
                  <input
                    className={inputCls}
                    placeholder="500mg"
                    value={rx.dosage || ''}
                    onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, dosage: e.target.value } : item)))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Frequency</label>
                  <input
                    className={inputCls}
                    placeholder="3x / day"
                    value={rx.frequency || ''}
                    onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, frequency: e.target.value } : item)))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Duration</label>
                  <input
                    className={inputCls}
                    placeholder="7 days"
                    value={rx.duration || ''}
                    onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, duration: e.target.value } : item)))}
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  <input
                    className={`${inputCls} w-16 text-center`}
                    placeholder="Qty"
                    type="number"
                    value={rx.quantity || ''}
                    onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, quantity: e.target.value } : item)))}
                  />
                  <button type="button" onClick={() => onChange(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  className={`${inputCls} flex-1 text-xs`}
                  placeholder="Instructions (e.g. Take after meals)"
                  value={rx.instructions || ''}
                  onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, instructions: e.target.value } : item)))}
                />
                <button
                  type="button"
                  onClick={() => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, isActive: !item.isActive } : item)))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    rx.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {rx.isActive ? 'Active' : 'Discontinued'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}