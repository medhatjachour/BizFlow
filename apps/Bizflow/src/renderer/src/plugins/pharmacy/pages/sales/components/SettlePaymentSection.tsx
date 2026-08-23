import React from 'react'
import { Wallet, X, Check } from 'lucide-react'
import { money, inputCls } from '../../components/_shared'

interface SettlePaymentSectionProps {
  outstanding: number
  isPaying: boolean
  payAmount: string
  busy: boolean
  onTogglePaying: (val: boolean) => void
  onPayAmountChange: (val: string) => void
  onSettle: (full: boolean) => void
}

export const SettlePaymentSection: React.FC<SettlePaymentSectionProps> = ({
  outstanding,
  isPaying,
  payAmount,
  busy,
  onTogglePaying,
  onPayAmountChange,
  onSettle,
}) => {
  if (outstanding <= 0.005) return null

  if (!isPaying) {
    return (
      <button
        onClick={() => onTogglePaying(true)}
        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Wallet size={14} /> Record Outstanding Payment (${money(outstanding)})
      </button>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Settle Balance</span>
        <button onClick={() => onTogglePaying(false)} className="text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
          <input
            type="number"
            min="0"
            max={outstanding}
            value={payAmount}
            onChange={e => onPayAmountChange(e.target.value)}
            placeholder={money(outstanding)}
            autoFocus
            className={`${inputCls} pl-6 py-1 text-xs`}
          />
        </div>

        <button
          onClick={() => onSettle(false)}
          disabled={busy || !payAmount || parseFloat(payAmount) <= 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 disabled:opacity-40"
        >
          Pay
        </button>
        <button
          onClick={() => onSettle(true)}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
        >
          <Check size={12} /> Pay All
        </button>
      </div>
    </div>
  )
}