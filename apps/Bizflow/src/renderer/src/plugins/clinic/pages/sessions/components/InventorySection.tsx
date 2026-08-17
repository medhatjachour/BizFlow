// sessions/components/sessionForm/InventorySection.tsx
import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { SessionMaterialItem } from '../types'

interface Props {
  sessionMaterials: SessionMaterialItem[]
  onChange: React.Dispatch<React.SetStateAction<SessionMaterialItem[]>>
  availableMaterials: any[]
  onAddMaterial: (mat: any) => void
}

export default function InventorySection({ sessionMaterials, onChange, availableMaterials, onAddMaterial }: Props) {
  const [materialSearch, setMaterialSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-visible bg-white dark:bg-slate-900 p-4">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Search Clinical Material to Deduct
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className={`${inputCls} pl-10`}
            placeholder="Search syringes, gloves, sutures..."
            value={materialSearch}
            onChange={e => { setMaterialSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5">
              {availableMaterials
                .filter(m => !materialSearch || m.name.toLowerCase().includes(materialSearch.toLowerCase()))
                .map(mat => (
                  <button
                    key={mat.id}
                    type="button"
                    onMouseDown={() => { onAddMaterial(mat); setMaterialSearch(''); setShowDropdown(false) }}
                    className="w-full text-left px-3.5 py-2 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{mat.name}</span>
                    <span className="text-slate-400 font-medium">In Stock: {mat.quantity} {mat.unit}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
          Materials Deducted for Visit
        </div>
        {sessionMaterials.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 italic">No supplies attached to this visit.</p>
        ) : (
          <div className="p-4 space-y-3">
            {sessionMaterials.map((m, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 font-bold text-sm text-slate-800 dark:text-white">{m.materialName}</div>
                  <div className="flex items-center gap-1.5 w-32">
                    <input
                      type="number"
                      step="0.01"
                      className={`${inputCls} py-1 text-center`}
                      value={m.quantityUsed}
                      onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, quantityUsed: e.target.value } : item)))}
                    />
                    <span className="text-xs text-slate-400 font-medium">{m.unit}</span>
                  </div>
                  <button type="button" onClick={() => onChange(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {m.batches && m.batches.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold">Batch:</span>
                    <select
                      className={`${inputCls} py-1 text-xs`}
                      value={m.batchId || ''}
                      onChange={e => onChange(prev => prev.map((item, i) => (i === idx ? { ...item, batchId: e.target.value } : item)))}
                    >
                      <option value="">No specific batch</option>
                      {m.batches.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.batchNumber || b.id.slice(0, 6)} ({b.quantity} {m.unit} available)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}