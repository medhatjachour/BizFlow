import {  TrendingUp } from 'lucide-react'
import type { SummaryData } from '../types'
import { formatCurrency } from '../utils'

interface Props {
  summary: SummaryData | null
}

export function TopProducts({ summary }: Props) {
  if (!summary?.topProducts?.length) return null

  const maxQty = Math.max(...summary.topProducts.map(p => p.qty))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Top Products
        </h3>
      </div>
      <div className="space-y-2">
        {summary.topProducts.slice(0, 5).map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {p.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                  {p.qty} sold · {formatCurrency(p.revenue)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${(p.qty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
