import { useState, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import {
  TrendingUp, CheckCircle, Clock, Banknote, ClipboardList,
  CreditCard, Smartphone, FileText, ShoppingCart,
  Activity, X,
} from 'lucide-react'
import type { Shift } from '../types'
import {
  shiftDuration, shiftDurationSeconds, avgOrdersPerHour, avgTicket,
  formatMoney, formatTime, formatRelative,
} from '../utils'

interface Props {
  shift: Shift
  expectedDrawer: number
  onClose: () => void
}

export function ActiveShiftPanel({ shift, expectedDrawer, onClose }: Props) {
  // ── Live timer (updates every second) ──
  const { t } = useLanguage()
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const stats = [
    { label: t('cfRevenue') || 'Revenue',       value: formatMoney(shift.totalSales),                icon: TrendingUp,    color: '#16a34a' },
    { label: t('cfOrders') || 'Orders',        value: String(shift.totalOrders),                    icon: CheckCircle,   color: '#7c3aed' },
    { label: t('cfDuration') || 'Duration',      value: shiftDuration(shift),                         icon: Clock,         color: '#0891b2' },
    { label: t('cfAvgTicket') || 'Avg Ticket',    value: formatMoney(Number(avgTicket(shift))),        icon: Banknote,      color: '#ea580c' },
    { label: t('cfOrdersPerHour') || 'Orders/Hour',   value: avgOrdersPerHour(shift),                      icon: ClipboardList, color: '#a16207' },
  ]

  const payments = [
    { label: t('cfCash') || 'Cash',    value: shift.cashTotal,          icon: Banknote,   color: '#16a34a' },
    { label: t('cfCard') || 'Card',    value: shift.cardTotal,          icon: CreditCard, color: '#7c3aed' },
    { label: t('cfVodafone') || 'Vodafone',value: shift.vodafoneCashTotal,  icon: Smartphone, color: '#ea580c' },
  ]

  const totalPayment = shift.cashTotal + shift.cardTotal + shift.vodafoneCashTotal

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
      {/* ── Header with live indicator ── */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          {/* Pulsing live dot */}
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {t('cfActiveShift') || 'Active Shift'}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                · {shiftDurationSeconds(shift)}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {shift.cashier.fullName ?? shift.cashier.username} · started {formatRelative(shift.openedAt)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-md font-semibold transition-colors shadow-sm"
        >
          <X size={14} />
            {t('cfCloseShift') || 'Close Shift'}
        </button>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-200 dark:bg-slate-700">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: s.color + '20', color: s.color }}
                >
                  <Icon size={12} />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {s.label}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {s.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Two columns: Payment split + Drawer position ── */}
      <div className="grid md:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700">
        {/* Payment split */}
        <div className="bg-white dark:bg-slate-800 p-4">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
           {t('cfPaymentSplit') || 'Payment Split'}
          </h4>

          {/* Visual bar */}
          {totalPayment > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-slate-100 dark:bg-slate-700">
              {payments.map(p => {
                const pct = (p.value / totalPayment) * 100
                return (
                  <div
                    key={p.label}
                    title={`${p.label}: ${formatMoney(p.value)} (${pct.toFixed(0)}%)`}
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                    className="transition-all duration-500"
                  />
                )
              })}
            </div>
          )}

          {/* Breakdown */}
          <div className="space-y-2">
            {payments.map(p => {
              const Icon = p.icon
              const pct = totalPayment > 0 ? (p.value / totalPayment) * 100 : 0
              return (
                <div key={p.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: p.color + '20', color: p.color }}
                    >
                      <Icon size={12} />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{p.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(p.value)}
                    </div>
                    <div className="text-[10px] text-slate-400">{pct.toFixed(0)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Drawer position */}
        <div className="bg-white dark:bg-slate-800 p-4">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            {t('cfDrawerPosition') || 'Drawer Position'}
            
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('cfOpeningCash') || 'Opening Cash'}</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {formatMoney(shift.openingCash)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('cfCashSales') || '+ Cash Sales'}</span>
              <span className="font-semibold text-green-600 tabular-nums">
                {formatMoney(shift.cashTotal)}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('cfExpectedDrawer') || 'Expected in Drawer'}
                </span>
                <span className="text-lg font-bold text-amber-600 tabular-nums">
                  {formatMoney(expectedDrawer)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {shift.notes && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2">
            <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                {t('cfShiftNotes') || 'Shift Notes'}

              </div>
              <p className="-sm text-slate-700 dark:text-slate-300">{shift.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent orders ── */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <Activity size={14} />
            {t('cfRecentOrders') || 'Recent Orders'}
          </h4>
          <span className="text-xs text-slate-400">
            {(shift.orders ?? []).length} {t('cfThisShift') || 'this shift'}
          </span>
        </div>

        {(shift.orders ?? []).length === 0 ? (
          <div className="text-center py-6">
            <ShoppingCart size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('cfNoOrdersYet') || 'No orders yet'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('cfNoOrdersYetDescription') || 'Orders will appear here as they\'re processed.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(shift.orders ?? []).slice(0, 6).map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase">
                      {order.type.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      order.status === 'closed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {formatTime(order.openedAt)}
                    {order.customerName && ` · ${order.customerName}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatMoney(order.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
