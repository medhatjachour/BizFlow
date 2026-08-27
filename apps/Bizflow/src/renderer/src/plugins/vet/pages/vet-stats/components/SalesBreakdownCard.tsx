import { Tag, DollarSign, TrendingDown } from 'lucide-react'
import { SalesBreakdown } from '../types'
import { formatCurrency } from '../utils'

export function SalesBreakdownCard({ breakdown }: { breakdown: SalesBreakdown }) {
  if (!breakdown || (breakdown.byCategory.length === 0 && breakdown.byPayment.length === 0)) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Breakdown */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Tag size={16} className="text-violet-500" /> Sales by Category
        </h3>
        <div className="space-y-3">
          {breakdown.byCategory.map((c) => {
            const maxRev = breakdown.byCategory[0]?.revenue || 1
            const pct = maxRev > 0 ? (c.revenue / maxRev) * 100 : 0
            return (
              <div key={c.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1.5">
                    {c.category}
                    <span className="text-[10px] text-slate-400 font-normal">({c.saleCount} sales)</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.revenue)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-500" /> Payment Distribution
        </h3>
        <div className="space-y-3">
          {breakdown.byPayment.map((p) => {
            const maxRev = Math.max(...breakdown.byPayment.map((x) => x.revenue), 1)
            const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0
            const tone =
              p.method === 'cash' ? 'bg-emerald-500' : p.method === 'card' ? 'bg-blue-500' : 'bg-violet-500'

            return (
              <div key={p.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1.5">
                    {p.method}
                    <span className="text-[10px] text-slate-400 font-normal">({p.saleCount} receipts)</span>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.revenue)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}

          {breakdown.refunds.count > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 px-3 py-2 text-xs">
              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <TrendingDown size={14} /> {breakdown.refunds.count} Refunds processed
              </span>
              <span className="font-black text-rose-600 dark:text-rose-400">−{formatCurrency(breakdown.refunds.amount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}   