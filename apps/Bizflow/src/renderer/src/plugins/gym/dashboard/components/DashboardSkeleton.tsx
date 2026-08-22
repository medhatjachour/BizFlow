import React from 'react'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-5 space-y-5 animate-pulse">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40" />
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 w-3/4" />

      {/* Bento Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>

      {/* Chart Skeleton */}
      <div className="h-36 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
    </div>
  )
}