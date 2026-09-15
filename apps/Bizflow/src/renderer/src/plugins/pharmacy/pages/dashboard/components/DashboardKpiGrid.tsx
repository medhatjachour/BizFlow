import React from 'react'
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Package,
  Activity,
  Wallet,
} from 'lucide-react'
import { DashboardOverview, DashboardPeriod } from '../types'
import { money, int } from '../../components/_shared'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DashboardKpiGridProps {
  overview: DashboardOverview
  period: DashboardPeriod
  showProfit: boolean
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({
  overview,
  period,
  showProfit,
}) => {
  const { t } = useLanguage()
  const s = overview.sales ?? {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    margin: 0,
    saleCount: 0,
    unitsSold: 0,
  }

  const kpis = [
    {
      label: t('bakeryTodayRevenue'),
      value: `$${money(overview.today?.revenue ?? 0)}`,
      sub: t('phDbSalesTodaySub', { count: int(overview.today?.saleCount ?? 0) }),
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t('phDashRevenuePeriod', { period }),
      value: `$${money(s.revenue)}`,
      sub: showProfit ? t('phDbProfitSub', { amount: `$${money(s.grossProfit)}` }) : t('phDbOrdersSub', { count: int(s.saleCount) }),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('phDashSalesCountPeriod', { period }),
      value: int(s.saleCount),
      sub: t('phDbUnitsDispensedSub', { count: int(s.unitsSold) }),
      icon: ShoppingBag,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: t('phDashInventoryAssetValue'),
      value: `$${money(overview.stockValue)}`,
      sub: t('phDbCatalogSkusSub', { count: int(overview.activeProducts) }),
      icon: Package,
      color: 'text-teal-600 dark:text-teal-400',
    },
    ...(showProfit
      ? [
          {
            label: t('phDashOperatingMargin'),
            value: `${(s.margin || 0).toFixed(1)}%`,
            sub: t('phDbCogsSub', { amount: `$${money(s.cogs)}` }),
            icon: Activity,
            color:
              (s.margin || 0) >= 25
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
          },
        ]
      : []),
    {
      label: t('vetTotalReceivables'),
      value: `$${money(overview.outstanding)}`,
      sub: t('phDbUnpaidBalances'),
      icon: Wallet,
      color: overview.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map(k => (
        <div
          key={k.label}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <k.icon size={14} className={k.color} />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                {k.label}
              </span>
            </div>
            <p className={`text-base font-extrabold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}