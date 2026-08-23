import React from 'react'
import { Award, Package } from 'lucide-react'
import { TopProductMetric } from '../types'
import { money, int } from '../../components/_shared'

interface TopProductsPerformanceProps {
  products: TopProductMetric[]
}

export const TopProductsPerformance: React.FC<TopProductsPerformanceProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <Package size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-xs font-medium">No sales recorded for this selected time window.</p>
      </div>
    )
  }

  const maxRevenue = products[0]?.revenue || 1

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-amber-500" />
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
            Top Revenue Generating Products
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">{products.length} Products Ranked</span>
      </div>

      <div className="space-y-2.5">
        {products.map((p, i) => {
          const pct = Math.round((p.revenue / maxRevenue) * 100)

          return (
            <div key={p.id || i} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className={`h-4 w-4 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                      i === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : i === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : i === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800/60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">({int(p.units)} units)</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  ${money(p.revenue)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}