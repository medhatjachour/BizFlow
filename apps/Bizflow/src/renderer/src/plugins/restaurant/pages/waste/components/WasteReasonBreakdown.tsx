// src/pages/waste/components/WasteReasonBreakdown.tsx
import React from 'react'
import { Flame, Ban, Clock, RotateCcw, Scissors } from 'lucide-react'

interface Props {
  breakdown: Record<string, { count: number; totalCost: number }>
  totalLoss: number
}

const REASON_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  expired: { label: 'Spoiled / Expired', icon: Clock, color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
  dropped_spill: { label: 'Dropped / Spilled', icon: Ban, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20' },
  overcooked: { label: 'Overcooked / Burnt', icon: Flame, color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
  customer_returned: { label: 'Customer Returned', icon: RotateCcw, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  prep_trim: { label: 'Excess Prep Trim', icon: Scissors, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' }
}

export const WasteReasonBreakdown: React.FC<Props> = ({ breakdown, totalLoss }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs select-none">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Shrinkage Distribution by Root Cause
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {Object.entries(REASON_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const data = breakdown[key] || { count: 0, totalCost: 0 }
          const pct = totalLoss > 0 ? Math.round((data.totalCost / totalLoss) * 100) : 0

          return (
            <div
              key={key}
              className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 ${cfg.color}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-black">{pct}% of Loss</span>
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 dark:text-white block">
                  ${data.totalCost.toFixed(2)}
                </span>
                <span className="text-[11px] font-bold opacity-80 block truncate">
                  {cfg.label} ({data.count})
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}