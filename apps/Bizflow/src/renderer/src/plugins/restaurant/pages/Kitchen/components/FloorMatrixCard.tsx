import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { OverviewMetrics } from '../types'

interface Props {
  metrics: OverviewMetrics
}

export const FloorMatrixCard: React.FC<Props> = ({ metrics }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-3.5 shadow-2xs">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide uppercase">
          Dining Floor Breakdown Matrix
        </span>
        <button className="text-slate-400 hover:text-slate-600">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.available}
            </div>
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Available</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center">
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              {metrics.occupied}
            </div>
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Occupied</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-center">
            <div className="text-xl font-black text-purple-600 dark:text-purple-400">
              {metrics.billing}
            </div>
            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Billing Out</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-center">
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {metrics.reserved}
            </div>
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Reserved</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-center">
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">
              {metrics.cleaning}
            </div>
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Cleaning</div>
          </div>
        </div>
      )}
    </div>
  )
}