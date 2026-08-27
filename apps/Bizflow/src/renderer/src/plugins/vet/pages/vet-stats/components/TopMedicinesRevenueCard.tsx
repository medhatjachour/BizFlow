import { Pill } from 'lucide-react'
import { MedSummaryStat } from '../types'
import { formatCurrency } from '../utils'

export function TopMedicinesRevenueCard({ medSummary }: { medSummary: MedSummaryStat }) {
  const topMeds = medSummary?.topMedicines ?? []
  const maxRev = topMeds[0]?.revenue || 1

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <Pill size={16} className="text-violet-500" /> Top Medicines by Revenue
      </h3>
      <div className="space-y-3">
        {topMeds.map((m, i) => {
          const pct = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px] flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">{i + 1}</span>
                  {m.name}
                  <span className="text-[10px] text-slate-400 font-normal">({m.saleCount}×)</span>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(m.revenue)}</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}

        {topMeds.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No medicine sales in this period</p>
        )}
      </div>
    </div>
  )
}