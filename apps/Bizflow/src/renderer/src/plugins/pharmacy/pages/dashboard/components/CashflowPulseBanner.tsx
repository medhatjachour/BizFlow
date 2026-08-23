import React from 'react'
import {
  ArrowDownCircle,
  Wallet,
  ArrowUpCircle,
  PackageMinus,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { CashflowSnapshot } from '../types'
import { money, int } from '../../components/_shared'

interface CashflowPulseBannerProps {
  cashflow: CashflowSnapshot | null
  onNavigate?: (tab: string) => void
}

export const CashflowPulseBanner: React.FC<CashflowPulseBannerProps> = ({
  cashflow,
  onNavigate,
}) => {
  if (!cashflow) return null

  const pulseCards = [
    {
      key: 'cash',
      label: 'Cash In Today',
      value: `$${money(cashflow.cashToday)}`,
      sub: `${int(cashflow.txToday)} sales transactions`,
      icon: ArrowDownCircle,
      cardClass: 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      tab: 'sales',
    },
    {
      key: 'recv',
      label: 'Receivables Due',
      value: `$${money(cashflow.receivables)}`,
      sub: 'To collect from customers',
      icon: Wallet,
      cardClass: 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20',
      iconClass: 'text-amber-600 dark:text-amber-400',
      tab: 'customers',
    },
    {
      key: 'pay',
      label: 'Vendor Payables',
      value: `$${money(cashflow.payables)}`,
      sub: `${int(cashflow.openOrders)} open purchase orders`,
      icon: ArrowUpCircle,
      cardClass: 'border-orange-200/80 dark:border-orange-900/60 bg-orange-50/50 dark:bg-orange-950/20',
      iconClass: 'text-orange-600 dark:text-orange-400',
      tab: 'orders',
    },
    {
      key: 'stock',
      label: 'Stock Alerts',
      value: `${int(cashflow.outOfStock + cashflow.lowStock)}`,
      sub: `${int(cashflow.outOfStock)} out · ${int(cashflow.lowStock)} low`,
      icon: PackageMinus,
      cardClass: 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20',
      iconClass: 'text-rose-600 dark:text-rose-400',
      tab: 'products',
    },
    {
      key: 'exp',
      label: 'Expiry Watch',
      value: `${int(cashflow.expiring + cashflow.expired)}`,
      sub: `${int(cashflow.expired)} expired · ${int(cashflow.expiring)} ≤30d`,
      icon: AlertTriangle,
      cardClass: 'border-red-200/80 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20',
      iconClass: 'text-red-600 dark:text-red-400',
      tab: 'inventory',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
      {pulseCards.map(c => (
        <button
          key={c.key}
          type="button"
          disabled={!onNavigate}
          onClick={() => onNavigate?.(c.tab)}
          className={`group text-left rounded-2xl border p-3.5 transition-all shadow-2xs ${
            c.cardClass
          } ${onNavigate ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : 'cursor-default'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <c.icon size={15} className={c.iconClass} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                {c.label}
              </span>
            </div>
            {onNavigate && (
              <ChevronRight
                size={13}
                className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            )}
          </div>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{c.value}</p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">{c.sub}</p>
        </button>
      ))}
    </div>
  )
}