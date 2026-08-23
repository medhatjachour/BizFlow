import React from 'react'

export const ReportsSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )
}