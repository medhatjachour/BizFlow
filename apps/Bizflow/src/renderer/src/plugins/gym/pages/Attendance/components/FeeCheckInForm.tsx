import { useState } from 'react'
import { Minus, Plus, CheckCircle2, Loader2, X } from 'lucide-react'
import { Trainee, PaymentMethod } from '../types'
import { DEFAULT_FEE_PRESETS, PAYMENT_METHODS } from '../constants'

interface FeeCheckInFormProps {
  trainee: Trainee
  feeAmount: string
  feePayMethod: PaymentMethod
  checkingInFee: boolean
  onAmountChange: (amount: string) => void
  onMethodChange: (method: PaymentMethod) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function FeeCheckInForm({
  trainee,
  feeAmount,
  feePayMethod,
  checkingInFee,
  onAmountChange,
  onMethodChange,
  onSubmit,
  onCancel
}: FeeCheckInFormProps) {
  const [presets, setPresets] = useState<number[]>(DEFAULT_FEE_PRESETS)
  const [customPresetInput, setCustomPresetInput] = useState('')

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(customPresetInput)
    if (val > 0 && !presets.includes(val)) {
      setPresets(prev => [...prev, val].sort((a, b) => a - b))
    }
    setCustomPresetInput('')
  }

  const handleRemovePreset = (val: number) => {
    setPresets(prev => prev.filter(p => p !== val))
  }

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 px-4 py-3.5 space-y-3 rounded-b-xl"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-blue-800 dark:text-blue-300">
        <span>Set Visit Entry Fee for {trainee.name}</span>
        <span className="text-[10px] text-blue-500 font-normal">No active subscription</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Stepper */}
        <div className="flex items-center rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => onAmountChange(String(Math.max(0, (parseFloat(feeAmount) || 0) - 5)))}
            className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95 transition-all"
          >
            <Minus size={13} />
          </button>
          <input
            value={feeAmount}
            onChange={e => onAmountChange(e.target.value)}
            type="number"
            min="0"
            step="0.5"
            required
            autoFocus
            placeholder="0.00"
            className="w-20 text-center text-sm font-bold text-blue-700 dark:text-blue-300 bg-transparent focus:outline-none py-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => onAmountChange(String((parseFloat(feeAmount) || 0) + 5))}
            className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95 transition-all"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {presets.map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => onAmountChange(String(amt))}
              className={`group relative px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                parseFloat(feeAmount) === amt
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-slate-800 hover:bg-blue-50'
              }`}
            >
              {amt}
              {!DEFAULT_FEE_PRESETS.includes(amt) && (
                <span
                  onClick={e => {
                    e.stopPropagation()
                    handleRemovePreset(amt)
                  }}
                  className="hidden group-hover:inline-flex absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white rounded-full items-center justify-center text-[9px]"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          <div className="flex items-center">
            <input
              value={customPresetInput}
              onChange={e => setCustomPresetInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddPreset(e)
              }}
              type="number"
              min="1"
              placeholder="+ custom"
              className="w-16 text-center text-[11px] font-semibold px-1.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Payment method selector & actions */}
      <div className="flex items-center gap-2 pt-1">
        <select
          value={feePayMethod}
          onChange={e => onMethodChange(e.target.value as PaymentMethod)}
          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAYMENT_METHODS.map(pm => (
            <option key={pm.value} value={pm.value}>
              {pm.icon} {pm.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={checkingInFee || !feeAmount || parseFloat(feeAmount) <= 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
        >
          {checkingInFee ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          <span>Confirm & Check In</span>
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
  )
}