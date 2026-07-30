import {
  TrendingUp, Receipt, Percent,
  DollarSign, Package, Wallet, AlertCircle,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { LucideIcon } from 'lucide-react'
import type { FinanceOverview } from '../types'
import { formatMoney, formatNumber, formatPercent } from '../utils'

interface Props {
  overview: FinanceOverview | null
  loading: boolean
}

interface CardData {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  color: string
  bg: string
}

export function KpiCards({ overview, loading }: Props) {
  const { t } = useLanguage()
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse"
          >
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards: CardData[] = [
    {
      label: t('cfNetSales'),
      value: formatMoney(overview.netSales),
      sub:   `${formatNumber(overview.totalOrders)} ${t('cfOrders')}`,
      icon:  DollarSign,
      color: '#16a34a',
      bg:    'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: t('cfGrossSales'),
      value: formatMoney(overview.grossSales),
      sub:   t('cfBeforeDiscounts'),
      icon:  TrendingUp,
      color: '#0891b2',
      bg:    'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      label: t('cfAvgOrderValuePerTransaction'),
      value: formatMoney(overview.averageOrderValue),
      sub:   t('cfPerTransaction'),
      icon:  Receipt,
      color: '#7c3aed',
      bg:    'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: t('cfGrossProfitLabel'),
      value: formatMoney(overview.grossProfit),
      sub:   `${formatPercent(overview.grossMarginPct)} ${t('cfMargin')}`,
      icon:  Wallet,
      color: '#ea580c',
      bg:    'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: t('cfTotalDiscountsLabel'),
      value: formatMoney(overview.totalDiscount),
      sub:   `${overview.discountedOrders} ${t('cfDiscountedOrders')}`,
      icon:  Percent,
      color: '#dc2626',
      bg:    'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: t('cfCOGS'),
      value: formatMoney(overview.cogs),
      sub:   t('cfCostOfGoodsSoldShort'),
      icon:  Package,
      color: '#a16207',
      bg:    'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: t('cfNetProfitLabel'),
      value: formatMoney(overview.netProfitAfterExpenses),
      sub:   t('cfAfterAllExpenses'),
      icon:  TrendingUp,
      color: overview.netProfitAfterExpenses >= 0 ? '#16a34a' : '#dc2626',
      bg:    overview.netProfitAfterExpenses >= 0
        ? 'bg-green-50 dark:bg-green-900/20'
        : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: t('cfOpenOrdersLabel'),
      value: formatMoney(overview.openOrdersValue),
      sub:   `${overview.openOrdersCount} ${t('cfUnclosed')}`,
      icon:  AlertCircle,
      color: '#64748b',
      bg:    'bg-slate-100 dark:bg-slate-800',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow"
          >
            {/* Label + icon */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: card.bg.includes('dark:') ? undefined : card.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>

            {/* Value */}
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {card.value}
            </div>

            {/* Sub */}
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {card.sub}
            </div>
          </div>
        )
      })}
    </div>
  )
}
