// sessions/components/sessionForm/BillingSection.tsx
import { SessionStatus } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  amountCharged: string
  onAmountChargedChange: (val: string) => void
  amountPaid: string
  onAmountPaidChange: (val: string) => void
  paymentMethod: string
  onPaymentMethodChange: (val: string) => void
  followUpDate: string
  onFollowUpDateChange: (val: string) => void
  status: SessionStatus
  onStatusChange: (val: SessionStatus) => void
  isEditing: boolean
  isDefaultAppointment: boolean
}

export default function BillingSection({
  amountCharged,
  onAmountChargedChange,
  amountPaid,
  onAmountPaidChange,
  paymentMethod,
  onPaymentMethodChange,
  followUpDate,
  onFollowUpDateChange,
  status,
  onStatusChange,
  isEditing,
  isDefaultAppointment
}: Props) {
  const balanceDue = Math.max(0, (parseFloat(amountCharged) || 0) - (parseFloat(amountPaid) || 0))
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="space-y-4">
      {!isDefaultAppointment && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Visit Billing & Payment</span>
            {balanceDue > 0 ? (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-full border border-rose-200">
                Balance Due: {formatCurrency(balanceDue)}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-200">
                Fully Settled
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Charged Amount</label>
              <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={amountCharged} onChange={e => onAmountChargedChange(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Amount Collected</label>
              <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={amountPaid} onChange={e => onAmountPaidChange(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <select className={inputCls} value={paymentMethod} onChange={e => onPaymentMethodChange(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Credit / Debit Card</option>
                <option value="insurance">Insurance Coverage</option>
                <option value="transfer">Bank Wire / Transfer</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Scheduled Follow-up Date</label>
          <input
            type="date"
            className={inputCls}
            value={followUpDate ? followUpDate.slice(0, 10) : ''}
            onChange={e => onFollowUpDateChange(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">Surfaces automated reminder in the Follow-ups tab.</p>
        </div>
        {isEditing && (
          <div>
            <label className={labelCls}>Session Lifecycle Status</label>
            <select className={inputCls} value={status} onChange={e => onStatusChange(e.target.value as SessionStatus)}>
              <option value="completed">Completed Visit</option>
              <option value="active">Active / In-progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}