import React from 'react'
import { X, Phone, Mail, Receipt, Loader2, MapPin } from 'lucide-react'
import { money, int, PAY_BADGE } from '../../components/_shared'
import { CustomerSettleBar } from './CustomerSettleBar'
import { useCustomerProfile } from '../hooks/useCustomerProfile'

interface CustomerProfileModalProps {
  customerId: string
  onClose: () => void
  onChanged: () => void
  toast: any
  t: (k: string) => string
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  onClose,
  onChanged,
  toast,
  t,
}) => {
  const {
    data,
    loading,
    settling,
    payAmount,
    busy,
    setSettling,
    setPayAmount,
    executeSettle,
  } = useCustomerProfile(customerId, toast, t, onChanged)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {loading || !data ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
            <p className="text-xs">Loading customer profile & ledger...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-extrabold text-base">
                  {(data.customer.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    {data.customer.name}
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    {data.customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} /> {data.customer.phone}
                      </span>
                    )}
                    {data.customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={10} /> {data.customer.email}
                      </span>
                    )}
                    {data.customer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {data.customer.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Charged', value: `$${money(data.finance.totalCharged)}`, color: 'text-slate-800 dark:text-white' },
                  { label: 'Paid', value: `$${money(data.finance.totalPaid)}`, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Outstanding', value: `$${money(data.finance.outstanding)}`, color: data.finance.outstanding > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
                  { label: 'Sales Count', value: int(data.finance.salesCount), color: 'text-slate-800 dark:text-white' },
                  { label: 'Units Bought', value: int(data.finance.unitsBought), color: 'text-slate-800 dark:text-white' },
                ].map(k => (
                  <div key={k.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center border border-slate-100 dark:border-slate-800">
                    <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-[10px] text-slate-400 capitalize mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Settle Outstanding Action */}
              <CustomerSettleBar
                outstanding={data.finance.outstanding}
                settling={settling}
                payAmount={payAmount}
                busy={busy}
                onToggleSettling={setSettling}
                onPayAmountChange={setPayAmount}
                onSettle={executeSettle}
              />

              {/* Customer Notes */}
              {data.customer.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Notes & Allergies:</p>
                  <p className="text-slate-500 dark:text-slate-400">{data.customer.notes}</p>
                </div>
              )}

              {/* Purchase History */}
              <div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Receipt size={14} className="text-emerald-500" />
                  <span>Purchase History ({data.sales.length})</span>
                </h3>

                {data.sales.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No purchase history recorded for this customer.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {data.sales.map(s => {
                      const out =
                        s.status === 'refunded'
                          ? 0
                          : Math.max(0, s.total - (s.refundedAmount ?? 0) - s.amountPaid)

                      return (
                        <div key={s.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            #{s.saleNumber ?? '—'}
                          </span>
                          <span className="text-slate-400 flex-1">
                            {new Date(s.saleDate).toLocaleDateString([], { dateStyle: 'medium' })} · {s.items?.length ?? 0} items
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            ${money(s.total)}
                          </span>
                          {out > 0.005 && (
                            <span className="text-[10px] font-semibold text-red-500">
                              -${money(out)} due
                            </span>
                          )}
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold capitalize ${PAY_BADGE[s.paymentStatus] ?? PAY_BADGE.unpaid}`}>
                            {s.paymentStatus}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}