import React from 'react'

export const FinanceSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40" />
        ))}
      </div>

      {/* Main charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 h-72 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40" />
        <div className="lg:col-span-6 h-72 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40" />
      </div>

      {/* Summary banner skeleton */}
      <div className="h-32 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40" />
    </div>
  )
}