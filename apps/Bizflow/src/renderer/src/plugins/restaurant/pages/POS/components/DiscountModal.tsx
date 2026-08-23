import React, { useState } from 'react'
import { X } from 'lucide-react'
import { DiscountType } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onApply: (type: DiscountType, amount: number) => void
}

export const DiscountModal: React.FC<Props> = ({ isOpen, onClose, onApply }) => {
  const [type, setType] = useState<DiscountType>('percentage')
  const [amount, setAmount] = useState('10')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onApply(type, Number(amount || 0))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Apply Discount</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('percentage')}
            className={`py-2 rounded-xl text-xs font-bold ${
              type === 'percentage'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Percentage (%)
          </button>
          <button
            type="button"
            onClick={() => setType('fixed')}
            className={`py-2 rounded-xl text-xs font-bold ${
              type === 'fixed'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Fixed Amount ($)
          </button>
        </div>

        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm font-black focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
          >
            Apply
          </button>
        </div>
      </form>
    </div>
  )
}