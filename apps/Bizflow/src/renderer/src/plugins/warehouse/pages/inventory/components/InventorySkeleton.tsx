import React from 'react'

export const InventorySkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80" />
        ))}
      </div>
    </div>
  )
}