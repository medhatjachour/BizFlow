import {
  X, Loader2, TrendingUp, ShoppingBag, Clock, Banknote,
  Wallet, Receipt, FileText,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Shift } from '../types'

import {  payMeta, orderTypeMeta } from '../constants'
import { formatDate, formatDateTime, formatMoney, shiftDurationDetailed } from '../utils'

interface Props {
  shift: Shift | null
  loading: boolean
  onClose: () => void
}

export function ShiftDetailDrawer({ shift, loading, onClose }: Props) {
  if (!shift && !loading) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-2xl h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Shift Details</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {loading ? 'Loading…' : shiftDurationDetailed(shift!)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading || !shift ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* ── Cashier info ── */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Wallet size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {shift.cashier.fullName ?? shift.cashier.username}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(shift.openedAt)} → {shift.closedAt ? formatDate(shift.closedAt) : 'Active'}
                </div>
              </div>
            </div>

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700">
              {[
                { label: 'Opening Cash', value: formatMoney(shift.openingCash),       icon: Wallet,       color: '#0891b2' },
                { label: 'Closing Cash', value: formatMoney(shift.closingCash ?? 0),  icon: Banknote,     color: '#16a34a' },
                { label: 'Revenue',      value: formatMoney(shift.totalSales),        icon: TrendingUp,   color: '#7c3aed' },
                { label: 'Orders',       value: String(shift.totalOrders),            icon: ShoppingBag,  color: '#ea580c' },
                { label: 'Cash Diff',    value: (shift.cashDifference! > 0 ? '+' : '') + formatMoney(shift.cashDifference ?? 0), icon: Banknote, color: shift.cashDifference! < 0 ? '#dc2626' : shift.cashDifference! > 0 ? '#2563eb' : '#16a34a' },
                { label: 'Duration',     value: shiftDurationDetailed(shift),         icon: Clock,        color: '#a16207' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white dark:bg-slate-800 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: s.color + '20', color: s.color }}
                      >
                        <Icon size={10} />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {s.label}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {s.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Payment breakdown ── */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Payment Breakdown
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Cash',    value: shift.cashTotal },
                  { label: 'Card',    value: shift.cardTotal },
                  { label: 'Vodafone',value: shift.vodafoneCashTotal },
                ].map(p => (
                  <div key={p.label} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-center">
                    <div className="text-[10px] text-slate-400 uppercase">{p.label}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(p.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Notes ── */}
            {shift.notes && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      Shift Notes
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{shift.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Orders timeline ── */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <Receipt size={14} />
                  Shift Orders
                </h4>
                <span className="text-xs text-slate-400">
                  {(shift.orders ?? []).length} total
                </span>
              </div>

              {(shift.orders ?? []).length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  No orders in this shift
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />

                  <div className="space-y-3">
                    {shift.orders!.map(order => {
                      const pay = payMeta(order.paymentMethod ?? '')
                      const PayIcon = pay.icon
                      const typeMeta = orderTypeMeta(order.type)
                      const TypeIcon = typeMeta.icon
                      return (
                        <div key={order.id} className="relative flex gap-4">
                          {/* Icon node */}
                          <div
                            className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-800"
                            style={{ backgroundColor: pay.color + '20', color: pay.color }}
                          >
                            <PayIcon size={14} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                    {order.orderNumber}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase">
                                    <TypeIcon size={10} />
                                    {typeMeta.label}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                                    order.status === 'closed'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {formatDateTime(order.closedAt ?? order.openedAt)}
                                  {order.customerName && ` · ${order.customerName}`}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                  {formatMoney(order.total)}
                                </div>
                                <div className="text-[10px] text-slate-400">{pay.label}</div>
                              </div>
                            </div>

                            {/* Items */}
                            {(order.items ?? []).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                                {order.items!.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.quantity}×</span>
                                      {' '}{item.productName}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                                      {formatMoney(item.total)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
