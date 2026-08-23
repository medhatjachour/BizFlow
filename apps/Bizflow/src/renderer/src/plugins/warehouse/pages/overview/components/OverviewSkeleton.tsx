import React from 'react'

export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-1" aria-busy="true" aria-label="Loading overview">
      {/* Banner Skeleton */}
      <div className="rounded-2xl h-36 bg-slate-200 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60" />

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="w-12 h-4 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="space-y-1.5">
              <div className="w-14 h-6 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-20 h-3 rounded bg-slate-100 dark:bg-slate-850" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid Split Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800" />
        <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800" />
      </div>
    </div>
  )
}