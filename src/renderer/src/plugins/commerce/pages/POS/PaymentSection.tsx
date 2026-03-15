/**
 * Payment method selection and checkout component
 */

import { DollarSign, CreditCard, Receipt } from 'lucide-react'
import type { PaymentMethod } from './types'

type Props = {
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  subtotal: number
  tax: number
  total: number
  onCompleteSale: () => void
}

export default function PaymentSection({
  paymentMethod,
  onPaymentMethodChange,
  subtotal,
  tax,
  total,
  onCompleteSale
}: Props) {
  // Get tax rate from settings for display
  const taxRate = parseFloat(localStorage.getItem('taxRate') || '10')
  
  return (
    <div className="space-y-2">
      {/* Compact Summary */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span className="text-xs">Subtotal:</span>
          <span className="font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-600 dark:text-slate-400">
          <span className="text-xs">Tax ({taxRate}%):</span>
          <span className="font-semibold">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-300 dark:border-slate-600">
          <span>Total:</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Compact Payment Method */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Payment</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPaymentMethodChange('cash')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 transition-all text-sm font-semibold ${
              paymentMethod === 'cash'
                ? 'bg-success text-white border-success shadow-md'
                : 'border-slate-300 dark:border-slate-600 hover:border-success hover:bg-success/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <DollarSign size={16} />
            Cash
          </button>
          <button
            onClick={() => onPaymentMethodChange('card')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 transition-all text-sm font-semibold ${
              paymentMethod === 'card'
                ? 'bg-primary text-white border-primary shadow-md'
                : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <CreditCard size={16} />
            Card
          </button>
        </div>
      </div>

      {/* Compact Complete Button */}
      <button
        onClick={onCompleteSale}
        disabled={!paymentMethod}
        className={`w-full py-3 text-base font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
          paymentMethod
            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-[1.02] active:scale-95'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        <Receipt size={20} />
        Complete Sale
      </button>
    </div>
  )
}
