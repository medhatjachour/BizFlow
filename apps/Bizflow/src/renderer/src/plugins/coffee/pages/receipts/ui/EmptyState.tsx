import React from 'react'

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 text-slate-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
    </div>
  )
}
