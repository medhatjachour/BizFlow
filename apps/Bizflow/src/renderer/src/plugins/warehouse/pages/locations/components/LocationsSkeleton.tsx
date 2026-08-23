import React from 'react'

export const LocationsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5">
                <div className="w-32 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="w-24 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}