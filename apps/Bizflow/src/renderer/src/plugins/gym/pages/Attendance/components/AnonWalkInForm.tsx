import { useState } from 'react'
import { Footprints, Minus, Plus, Loader2, X } from 'lucide-react'
import { PaymentMethod } from '../types'
import { DEFAULT_ANON_PRESETS, PAYMENT_METHODS } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface AnonWalkInFormProps {
  name: string
  amount: string
  payMethod: PaymentMethod
  saving: boolean
  onNameChange: (val: string) => void
  onAmountChange: (val: string) => void
  onMethodChange: (val: PaymentMethod) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function AnonWalkInForm({
  name,
  amount,
  payMethod,
  saving,
  onNameChange,
  onAmountChange,
  onMethodChange,
  onSubmit,
  onCancel
}: AnonWalkInFormProps) {
  const { t } = useLanguage()
  const [presets, setPresets] = useState<number[]>(DEFAULT_ANON_PRESETS)
  const [customPreset, setCustomPreset] = useState('')

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(customPreset)
    if (val > 0 && !presets.includes(val)) {
      setPresets(prev => [...prev, val].sort((a, b) => a - b))
    }
    setCustomPreset('')
  }

  return (
    <div className="mt-3 rounded-2xl border border-teal-200/80 dark:border-teal-800/50 bg-gradient-to-br from-teal-50/80 to-emerald-50/40 dark:from-teal-950/20 dark:to-emerald-950/20 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
          <Footprints size={14} className="text-teal-600" />
          <span>Anonymous Walk-In Registration</span>
        </p>
        <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-200/50">
          Payment Required
        </span>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Name (Optional) */}
        <div>
          <input
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder={t('gymAnonName') || 'Guest name / Nickname (optional)'}
            className="w-full px-3.5 py-2 rounded-xl border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
        </div>

        {/* Stepper + Presets */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">Amount *</span>
          <div className="flex items-center rounded-xl border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => onAmountChange(String(Math.max(0, (parseFloat(amount) || 0) - 5)))}
              className="px-3 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 active:scale-95 transition-all"
            >
              <Minus size={13} />
            </button>
            <input
              value={amount}
              onChange={e => onAmountChange(e.target.value)}
              type="number"
              min="0"
              step="0.5"
              required
              placeholder="0.00"
              className="w-20 text-center text-sm font-bold text-teal-700 dark:text-teal-300 bg-transparent focus:outline-none py-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onAmountChange(String((parseFloat(amount) || 0) + 5))}
              className="px-3 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 active:scale-95 transition-all"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => onAmountChange(String(p))}
                className={`group relative px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                  parseFloat(amount) === p
                    ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                    : 'border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 bg-white/70 dark:bg-slate-800 hover:bg-teal-50'
                }`}
              >
                {p}
                {!DEFAULT_ANON_PRESETS.includes(p) && (
                  <span
                    onClick={e => {
                      e.stopPropagation()
                      setPresets(prev => prev.filter(x => x !== p))
                    }}
                    className="hidden group-hover:inline-flex absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full items-center justify-center text-[9px]"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}

            <input
              value={customPreset}
              onChange={e => setCustomPreset(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddPreset(e)
              }}
              type="number"
              min="1"
              placeholder="+ custom"
              className="w-16 text-center text-[11px] font-semibold px-1.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Method & Submit */}
        <div className="flex items-center gap-2 pt-1">
          <select
            value={payMethod}
            onChange={e => onMethodChange(e.target.value as PaymentMethod)}
            className="px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {PAYMENT_METHODS.map(pm => (
              <option key={pm.value} value={pm.value}>
                {pm.icon} {pm.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Footprints size={13} />}
            <span>{t('gymLog') || 'Log Walk-In Entry'}</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}