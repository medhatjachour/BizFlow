import React from 'react'
import { MapPin } from 'lucide-react'
import { LocationMetric } from '../types'
import { formatCompactCurrency } from '../utils'

interface Props {
  locations: LocationMetric[]
}

export const LocationUtilizationCard: React.FC<Props> = ({ locations }) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
          <MapPin className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Capacity Utilization
        </h3>
      </div>

      {locations.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {locations.slice(0, 5).map((loc, idx) => {
            const isHigh = loc.utilization > 85
            const isMid = loc.utilization > 60
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {loc.name}
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {loc.utilization.toFixed(0)}%
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHigh ? 'bg-rose-500' : isMid ? 'bg-amber-400' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, loc.utilization)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{formatCompactCurrency(loc.value)}</span>
                  <span>{loc.qty.toLocaleString()} units</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs">
          <MapPin className="w-6 h-6 opacity-30 mb-1" />
          No facility metrics computed
        </div>
      )}
    </div>
  )
}