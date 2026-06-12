/**
 * Success animation modal after completing a sale
 */

import { Check } from 'lucide-react'

type Props = {
  show: boolean
  total: number
  paymentMethod: 'cash' | 'card' | null
}

export default function SuccessModal({ show, total, paymentMethod }: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="glass-card p-8 max-w-md w-full text-center animate-scale-up">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={48} className="text-success" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sale Complete!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">Total: ${total.toFixed(2)}</p>
        <p className="text-sm text-slate-500">Payment: {paymentMethod === 'cash' ? 'Cash' : 'Card'}</p>
      </div>
    </div>
  )
}
