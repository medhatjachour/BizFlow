import React from 'react'

export const ReportSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/40" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/40" />
    </div>
  )
}