import React, { useState } from 'react'
import { X} from 'lucide-react'
import { PosOrder } from '../types'
import { PAYMENT_METHODS, TIP_PRESETS } from '../constants'
import { formatCurrency } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: PosOrder | null
  onProcessPayment: (amount: number, method: string, ref?: string, tip?: number) => Promise<any>
}

export const PaymentSplitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  order,
  onProcessPayment
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tenderAmount, setTenderAmount] = useState<string>('')
  const [tipRate, setTipRate] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [reference, ] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) return null

  const tipValue = customTip ? Number(customTip) : order.total * tipRate
  const remainingDue = Math.max(0, order.total - order.payments.reduce((s, p) => s + p.amount, 0))
  const grandTotalWithTip = remainingDue + tipValue

  const handlePayFull = () => {
    setTenderAmount(String(grandTotalWithTip.toFixed(2)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payAmount = Number(tenderAmount || grandTotalWithTip)
      await onProcessPayment(payAmount, paymentMethod, reference, tipValue)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Order Settlement</h3>
            <p className="text-xs text-slate-400">Table #{order.table?.number} • Balance Due</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Due Display Banner */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Total Due with Tip
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(grandTotalWithTip)}
          </div>
          <span className="text-[11px] text-slate-500">
            Base Due: {formatCurrency(remainingDue)}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Payment Method
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                type="button"
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === pm.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tip Presets */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Tip / Gratuity
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {TIP_PRESETS.map((rate) => (
              <button
                type="button"
                key={rate}
                onClick={() => {
                  setCustomTip('')
                  setTipRate(rate)
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tipRate === rate && !customTip
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {rate === 0 ? 'No Tip' : `${rate * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <label className="block">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tender Amount</span>
            <button
              type="button"
              onClick={handlePayFull}
              className="text-[11px] font-bold text-amber-600 hover:underline"
            >
              Pay Exact Total
            </button>
          </div>
          <input
            type="number"
            step="0.01"
            required
            placeholder={grandTotalWithTip.toFixed(2)}
            value={tenderAmount}
            onChange={(e) => setTenderAmount(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2.5 text-base font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
          >
            {isSubmitting ? 'Processing...' : 'Complete Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}