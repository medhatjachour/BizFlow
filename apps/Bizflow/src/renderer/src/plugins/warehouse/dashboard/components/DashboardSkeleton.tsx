import React from 'react'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true">
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  )
}