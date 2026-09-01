import { TrendingUp, DollarSign, ShoppingBag } from 'lucide-react'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SalesStats } from '../types'

interface StatsCardsProps {
  stats: SalesStats
}

export function StatsCards({ stats }: StatsCardsProps): JSX.Element {
  const { t } = useLanguage()

  const cards = [
    {
      label: t('salesUiFinalizedRevenue'),
      value: formatCurrency(stats.totalRevenue),
      detail: stats.hasData
        ? `${Math.abs(stats.weeklyRevenueChange).toFixed(1)}% ${t('fromLastWeek')}`
        : t('salesUiNoSalesData'),
      icon: DollarSign,
      tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
      trend: stats.weeklyRevenueChange
    },
    {
      label: t('salesUiCompletedSales'),
      value: formatLargeNumber(stats.totalSales),
      detail: `${stats.todayCount} ${t('salesUiToday')}`,
      icon: ShoppingBag,
      tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40'
    },
    {
      label: t('salesUiItemsSold'),
      value: formatLargeNumber(stats.totalItems),
      detail: t('salesUiAcrossTransactions'),
      icon: ShoppingBag,
      tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40'
    },
    {
      label: t('salesUiAverageSale'),
      value: formatCurrency(stats.avgSale),
      detail: t('perTransaction'),
      icon: DollarSign,
      tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
    }
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-400 truncate">{card.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{card.value}</p>
            </div>
            <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center ${card.tone}`}>
              <card.icon size={15} />
            </div>
          </div>
          <div className={`mt-2 flex items-center gap-1 text-[10px] ${card.trend != null && card.trend < 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {card.trend != null && <TrendingUp size={11} className={card.trend < 0 ? 'rotate-180' : ''} />}
            <span className="truncate">{card.detail}</span>
          </div>
        </div>
      ))}
    </div>
  )
}