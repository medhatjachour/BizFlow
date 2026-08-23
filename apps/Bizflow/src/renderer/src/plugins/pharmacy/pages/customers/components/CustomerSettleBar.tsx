import React from 'react'
import { Wallet, X, Check } from 'lucide-react'
import { money, inputCls } from '../../components/_shared'

interface CustomerSettleBarProps {
  outstanding: number
  settling: boolean
  payAmount: string
  busy: boolean
  onToggleSettling: (val: boolean) => void
  onPayAmountChange: (val: string) => void
  onSettle: (full: boolean) => void
}

export const CustomerSettleBar: React.FC<CustomerSettleBarProps> = ({
  outstanding,
  settling,
  payAmount,
  busy,
  onToggleSettling,
  onPayAmountChange,
  onSettle,
}) => {
  if (outstanding <= 0.005) return null

  if (!settling) {
    return (
      <button
        onClick={() => onToggleSettling(true)}
        className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Wallet size={14} /> Settle Outstanding Ledger Balance (${money(outstanding)})
      </button>
    )
  }

  return (
    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>Settle Ledger Balance</span>
        <button onClick={() => onToggleSettling(false)} className="text-slate-400 hover:text-slate-600">
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
          <Check size={12} /> Settle All
        </button>
      </div>
    </div>
  )
}