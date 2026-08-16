import { useState } from 'react'
import { Loader2, CheckCircle2, X, DollarSign } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Session } from '../types'
import { formatCurrency, formatDate } from '../utils'

export default function QuickPayModal({
  sessions,
  onClose,
  onPaid
}: {
  sessions: Session[]
  onClose: () => void
  onPaid: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')

  const unpaidSessions = sessions
    .filter(s => (s.amountCharged ?? 0) > (s.amountPaid ?? 0))
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())

  const totalOutstanding = unpaidSessions.reduce(
    (sum, s) => sum + ((s.amountCharged ?? 0) - (s.amountPaid ?? 0)),
    0
  )

  async function handlePay() {
    const paying = parseFloat(amount)
    if (isNaN(paying) || paying <= 0) return showToast('error', 'Enter a valid payment amount')
    if (paying > totalOutstanding) return showToast('error', 'Payment exceeds outstanding balance')

    setSaving(true)
    try {
      let remaining = paying
      for (const s of unpaidSessions) {
        if (remaining <= 0) break
        const due = (s.amountCharged ?? 0) - (s.amountPaid ?? 0)
        const applying = Math.min(due, remaining)
        const newPaid = (s.amountPaid ?? 0) + applying
        const newCharged = s.amountCharged ?? 0
        const newStatus = newPaid >= newCharged ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'

        await window.api.clinic.sessions.update(s.id, {
          amountPaid: newPaid,
          paymentStatus: newStatus,
          paymentMethod: method
        })
        remaining -= applying
      }
      showToast('success', `Payment of ${formatCurrency(paying)} applied`)
      onPaid()
    } catch {
      showToast('error', 'Failed to register session payment')
    } finally {
      setSaving(false)
    }
  }

  function applyQuickPreset(fraction: number) {
    const calculated = (totalOutstanding * fraction).toFixed(2)
    setAmount(calculated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Modal Top */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Collect Outstanding Payment</h2>
            <p className="text-xs text-slate-400 mt-0.5">Applies chronologically (oldest session first)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Outstanding sessions list */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {unpaidSessions.map(s => {
              const due = (s.amountCharged ?? 0) - (s.amountPaid ?? 0)
              return (
                <div key={s.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(s.visitDate)}</span>
                    {s.diagnosis && <span className="text-slate-400 ml-1.5 truncate max-w-[150px] inline-block align-bottom">— {s.diagnosis}</span>}
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(due)}</span>
                </div>
              )
            })}
          </div>

          {/* Outstanding Total Banner */}
          <div className="flex items-center justify-between rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4">
            <div>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Total Unpaid Balance</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickPreset(0.5)}
                className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-rose-600 rounded-lg border border-rose-200 dark:border-rose-800 shadow-sm"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => applyQuickPreset(1)}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg shadow-sm"
              >
                100%
              </button>
            </div>
          </div>

          {/* Amount & Method Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={totalOutstanding}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={totalOutstanding.toFixed(2)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="cash">Cash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="insurance">Insurance Coverage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  )
}