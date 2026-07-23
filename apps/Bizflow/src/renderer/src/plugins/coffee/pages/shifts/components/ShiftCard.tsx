import {
  Eye, Clock, TrendingUp, ShoppingBag,
  Banknote, CreditCard, Smartphone, Wallet, FileText,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Shift } from '../types'
import {
  shiftDuration, avgTicket, formatMoney, formatTime, varianceColor,
} from '../utils'

interface Props {
  shift: Shift
  onView: (id: string) => void
}

export function ShiftCard({ shift, onView }: Props) {
  const diff = shift.cashDifference ?? 0
  const isOpen = shift.status === 'open'
  const { t } = useLanguage()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Top row: status + date + duration */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              isOpen
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {shift.status}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock size={12} />
              {new Date(shift.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              · {shiftDuration(shift)}
            </span>
          </div>

          {/* Total + orders */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-bold text-slate-900 dark:text-white">
              <TrendingUp size={14} className="text-green-500" />
              {formatMoney(shift.totalSales)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
              <ShoppingBag size={10} />
              {shift.totalOrders} {t('cfOrders') || 'orders'}
            </div>
          </div>
        </div>

        {/* Cashier */}
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {shift.cashier.fullName ?? shift.cashier.username}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          Opened {formatTime(shift.openedAt)}
          {shift.closedAt && ` · closed ${formatTime(shift.closedAt)}`}
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { label: t('cfOpen') || 'Open',    value: shift.openingCash,         icon: Wallet },
            { label: t('cfCash') || 'Cash',    value: shift.cashTotal,           icon: Banknote },
            { label: t('cfCard') || 'Card',    value: shift.cardTotal,           icon: CreditCard },
            { label: t('cfVodafone') || 'Vodafone',value: shift.vodafoneCashTotal,   icon: Smartphone },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-slate-400 flex items-center gap-1">
                  <Icon size={10} />
                  {item.label}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatMoney(item.value)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Avg ticket + cash diff */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">{t('cfAvgTicket') || 'Avg Ticket'}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {avgTicket(shift)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{t('cfCashDiff') || 'Cash Diff'}</span>
            <span className={`font-semibold tabular-nums ${varianceColor(diff)}`}>
              {diff > 0 ? '+' : ''}{formatMoney(diff)}
            </span>
          </div>
        </div>
      </div>

      {/* Mini order preview */}
      {(shift.orders ?? []).length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-1">
            {(shift.orders ?? []).slice(0, 3).map(order => (
              <div key={order.id} className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {order.orderNumber}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatMoney(order.total)}
                </span>
                <span className="text-slate-400 text-[10px]">
                  {order.type.replace('_', ' ')} · {(order.paymentMethod || '-').replace('_', ' ')}
                </span>
              </div>
            ))}
            {(shift.orders ?? []).length > 3 && (
              <div className="text-[11px] text-slate-400 text-center pt-1">
                +{(shift.orders ?? []).length - 3} {t('cfOrders') || 'more orders'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {shift.notes && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-1.5">
            <FileText size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {shift.notes}
            </p>
          </div>
        </div>
      )}

      {/* View details button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onView(shift.id)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Eye size={14} />
          {t('cfViewFullDetails') || 'View Full Details'}
        </button>
      </div>
    </div>
  )
}
