import { ShoppingBag, Boxes, TrendingUp, DollarSign, TrendingDown, Activity } from 'lucide-react'
import { MedSummaryStat } from '../types'
import { formatCurrency, formatCompactNumber } from '../utils'

interface MedicineSalesKpisProps {
  medSummary: MedSummaryStat
  showProfit: boolean
}

export function MedicineSalesKpis({ medSummary, showProfit }: MedicineSalesKpisProps) {
  const avgSale = medSummary.saleCount > 0 ? medSummary.revenue / medSummary.saleCount : 0

  const cards = [
    { label: 'Med Invoices', value: formatCompactNumber(medSummary.saleCount), icon: ShoppingBag, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'Units Dispensed', value: formatCompactNumber(medSummary.unitsSold), icon: Boxes, color: 'text-sky-600 dark:text-sky-400' },
    { label: 'Med Revenue', value: formatCurrency(medSummary.revenue), icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Avg Ticket', value: formatCurrency(avgSale), icon: DollarSign, color: 'text-teal-600 dark:text-teal-400' },
    { label: 'COGS', value: formatCurrency(medSummary.costOfGoods), icon: TrendingDown, color: 'text-orange-500 dark:text-orange-400', isProfitOnly: true },
    { label: 'Gross Profit', value: formatCurrency(medSummary.grossProfit), icon: DollarSign, color: medSummary.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400', isProfitOnly: true },
    { label: 'Margin', value: `${medSummary.margin.toFixed(1)}%`, icon: Activity, color: medSummary.margin >= 35 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500', isProfitOnly: true }
  ].filter((c) => showProfit || !c.isProfitOnly)

  return (
    <div className="space-y-2.5">
      <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <ShoppingBag size={14} className="text-violet-500" />
        Pharmacy Performance
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-3.5 text-center shadow-sm hover:shadow-md transition-all"
            >
              <Icon className={`h-4 w-4 mx-auto mb-1.5 ${card.color}`} />
              <p className={`text-lg font-black tracking-tight ${card.color}`}>{card.value}</p>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{card.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}