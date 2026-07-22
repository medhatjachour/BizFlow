import React from 'react'

export function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  )
}
