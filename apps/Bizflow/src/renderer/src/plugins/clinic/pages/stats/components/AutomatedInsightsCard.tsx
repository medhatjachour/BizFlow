import React from 'react'
import { Lightbulb, TrendingUp, AlertCircle, Minus } from 'lucide-react'
import type { InsightItem } from '../types'

interface Props {
  insights: InsightItem[]
}

export const AutomatedInsightsCard: React.FC<Props> = ({ insights }) => {
  if (insights.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
          <Lightbulb className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Automated Clinical Insights & Advisory
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className={`flex items-start gap-2.5 text-xs p-3 rounded-2xl border font-medium ${
              ins.type === 'good'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                : ins.type === 'warn'
                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {ins.type === 'good' ? (
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : ins.type === 'warn' ? (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Minus className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}