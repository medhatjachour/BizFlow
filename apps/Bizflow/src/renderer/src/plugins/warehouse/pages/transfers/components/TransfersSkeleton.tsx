import React from 'react'

export const TransfersSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4" />
        ))}
      </div>
    </div>
  )
}