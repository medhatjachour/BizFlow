import React from 'react'
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Activity,
  Wallet,
  Coins,
} from 'lucide-react'
import { SalesReportData } from '../types'
import { money, int } from '../../components/_shared'

interface SalesKpiGridProps {
  sales: SalesReportData
}

export const SalesKpiGrid: React.FC<SalesKpiGridProps> = ({ sales }) => {
  const isHealthyMargin = (sales.margin || 0) >= 20
  const avgPerBasket = sales.saleCount > 0 ? sales.revenue / sales.saleCount : 0

  const kpis = [
    {
      label: 'Gross Revenue',
      value: `$${money(sales.revenue)}`,
      sub: `${int(sales.unitsSold)} units sold`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Cost of Goods (COGS)',
      value: `$${money(sales.cogs)}`,
      sub: 'Purchase cost basis',
      icon: Coins,
      color: 'text-orange-500 dark:text-orange-400',
    },
    {
      label: 'Gross Operating Profit',
      value: `$${money(sales.grossProfit)}`,
      sub: 'Net revenue after product cost',
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Profit Margin',
      value: `${(sales.margin || 0).toFixed(1)}%`,
      sub: isHealthyMargin ? 'Target met (>20%)' : 'Below target (<20%)',
      icon: Activity,
      color: isHealthyMargin ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Total Orders',
      value: int(sales.saleCount),
      sub: `Avg: $${money(avgPerBasket)} / sale`,
      icon: ShoppingBag,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Pending Receivables',
      value: `$${money(sales.outstanding)}`,
      sub: `$${money(sales.collected)} collected`,
      icon: Wallet,
      color: sales.outstanding > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {kpis.map(k => (
        <div
          key={k.label}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <k.icon size={14} className={k.color} />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">{k.label}</span>
            </div>
            <p className={`text-base font-extrabold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{k.sub}</p>
        </div>
      ))}
    </div>
  )
}