// src/pages/POS/components/PaymentSplitModal.tsx
import React, { useState } from 'react'
import { X, CreditCard, Banknote, Smartphone, Gift, CheckCircle2 } from 'lucide-react'
import { PosOrder } from '../types'
import { sounds } from '../../utils/sound'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: PosOrder | null
  onProcessPayment: (amount: number, method: string, ref?: string, tip?: number) => Promise<any>
}

const METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Credit Card', icon: CreditCard },
  { id: 'apple_pay', label: 'Contactless', icon: Smartphone },
  { id: 'voucher', label: 'Gift Voucher', icon: Gift }
]

export const PaymentSplitModal: React.FC<Props> = ({ isOpen, onClose, order, onProcessPayment }) => {
  if (!isOpen || !order) return null

  const alreadyPaid = order.payments.reduce((s, p) => s + p.amount, 0)
  const remainingBase = Math.max(0, order.total - alreadyPaid)

  const [method, setMethod] = useState('cash')
  const [tipRate, setTipRate] = useState<number>(0)
  const [customTip, setCustomTip] = useState<string>('')
  const [tenderAmount, setTenderAmount] = useState<string>(remainingBase.toFixed(2))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const tipValue = customTip ? Number(customTip) : remainingBase * tipRate
  const totalWithTip = remainingBase + tipValue
  const tenderNumber = Number(tenderAmount || totalWithTip)
  const changeDue = Math.max(0, tenderNumber - totalWithTip)

  const handleExact = () => {
    sounds.playBump()
    setTenderAmount(totalWithTip.toFixed(2))
  }

  const handlePreset = (amt: number) => {
    sounds.playBump()
    setTenderAmount(String(amt))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      sounds.playSuccess()
      await onProcessPayment(Math.min(tenderNumber, totalWithTip), method, undefined, tipValue)
      onClose()
    } catch {
      sounds.playError()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Check Settlement</h3>
            <p className="text-xs text-slate-400">Bill #{order.orderNumber} • Remaining Due</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Due Banner */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
            Total Balance with Tip
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 my-0.5">
            ${totalWithTip.toFixed(2)}
          </div>
          {alreadyPaid > 0 && (
            <span className="text-[10px] text-slate-400">Previous Payments: ${alreadyPaid.toFixed(2)}</span>
          )}
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon
            const isSelected = method === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  sounds.playBump()
                  setMethod(m.id)
                }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Tip Selector */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Server Gratuity
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 0.1, 0.15, 0.2].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  sounds.playBump()
                  setCustomTip('')
                  setTipRate(r)
                }}
                className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                  tipRate === r && !customTip
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {r === 0 ? 'No Tip' : `${r * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Cash Presets (If Cash Selected) */}
        {method === 'cash' && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Quick Cash Tender</span>
              <button type="button" onClick={handleExact} className="text-[11px] text-amber-600 hover:underline">
                Exact Total (${totalWithTip.toFixed(2)})
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[20, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePreset(amt)}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tender Input & Change Due */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Amount Tendered ($)
          </span>
          <input
            type="number"
            step="0.01"
            required
            value={tenderAmount}
            onChange={(e) => setTenderAmount(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {method === 'cash' && changeDue > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-800 dark:text-amber-300 flex justify-between items-center">
            <span>Change Due to Patron:</span>
            <span className="text-base font-black">${changeDue.toFixed(2)}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || tenderNumber <= 0}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Settling...' : 'Complete Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}