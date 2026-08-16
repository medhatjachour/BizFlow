// sessions/components/sessionForm/LabOrdersSection.tsx
import { Plus, Settings2, Trash2, FlaskConical } from 'lucide-react'
import { LabOrderItem } from '../types' // 1. Import the correct type
import SuggestInput from '@renderer/plugins/clinic/components/SuggestInput'

interface Props {
  labOrders: LabOrderItem[]
  // 2. FIXED: Changed PrescriptionItem[] to LabOrderItem[]
  onChange: React.Dispatch<React.SetStateAction<LabOrderItem[]>> 
  allLabs: string[]
  onManageLabs: () => void
}

export default function LabOrdersSection({ labOrders, onChange, allLabs, onManageLabs }: Props) {
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Laboratory Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onManageLabs} className="text-xs text-teal-600 hover:underline flex items-center gap-1 font-semibold">
            <Settings2 className="h-3 w-3" /> Preset Labs
          </button>
          <button
            type="button"
            // 3. Ensure the object structure matches LabOrderItem ({ testName: '' })
            onClick={() => onChange(prev => [...prev, { testName: '' }])}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Lab Test
          </button>
        </div>
      </div>

      {labOrders.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6 italic">No lab tests ordered yet.</p>
      ) : (
        <div className="p-4 space-y-3 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {labOrders.map((lab, idx) => (
            <div key={idx} className="pt-3 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Test Name *</label>
                <SuggestInput
                  className={inputCls}
                  suggestions={allLabs}
                  value={lab.testName} // 4. FIXED: testName instead of medicineName
                  onChange={v => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, testName: v } : item)))}
                  placeholder="e.g. CBC, HbA1c..."
                />
              </div>
              <div className="sm:col-span-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Notes / Instructions</label>
                <input
                  className={inputCls}
                  placeholder="Clinical notes..."
                  value={lab.notes || ''} // 5. FIXED: notes instead of instructions
                  onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, notes: e.target.value } : item)))}
                />
              </div>
              <div className="sm:col-span-1 pt-4 flex justify-end">
                <button type="button" onClick={() => onChange(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}