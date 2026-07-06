import { useState } from 'react'
import { Loader2, CheckCircle2, X } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Session } from '../../patientProfile.types'

export default function QuickPayModal({
  sessions,
  onClose,
  onPaid,
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
    .filter((s) => (s.amountCharged ?? 0) > (s.amountPaid ?? 0))
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())

  const totalOutstanding = unpaidSessions.reduce(
    (sum, s) => sum + ((s.amountCharged ?? 0) - (s.amountPaid ?? 0)),
    0
  )

  async function handlePay() {
    const paying = parseFloat(amount)
    if (isNaN(paying) || paying <= 0) return showToast('error', 'Enter a valid amount')
    if (paying > totalOutstanding) return showToast('error', 'Amount exceeds outstanding balance')
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
          paymentMethod: method,
        })
        remaining -= applying
      }
      showToast('success', `Payment of ${fmt(paying)} recorded`)
      onPaid()
    } catch {
      showToast('error', 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Collect Payment</h2>
            <p className="text-xs text-slate-400 mt-0.5">Applied oldest-to-newest across sessions</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Outstanding sessions list */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {unpaidSessions.map((s) => {
              const due = (s.amountCharged ?? 0) - (s.amountPaid ?? 0)
              return (
                <div key={s.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {new Date(s.visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {s.diagnosis && <span className="text-slate-400 ml-1.5">— {s.diagnosis}</span>}
                  </div>
                  <span className="font-bold text-red-500 dark:text-red-400">{fmt(due)}</span>
                </div>
              )
            })}
          </div>
          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3">
            <span className="text-sm text-red-700 dark:text-red-400 font-semibold">Total Outstanding</span>
            <span className="text-xl font-black text-red-600 dark:text-red-400">{fmt(totalOutstanding)}</span>
          </div>
          {/* Amount + method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount to Pay</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={totalOutstanding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={fmt(totalOutstanding)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent outline-none"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={handlePay}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-emerald-500/20"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  )
}
