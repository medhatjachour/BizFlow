import React from 'react'

interface Props {
  label: string
  value: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  sub?: string
}

export const FinanceKpiCard: React.FC<Props> = ({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  sub
}) => {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-600 ${bgClass}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={`p-2 rounded-2xl bg-white/70 dark:bg-slate-800/70 shadow-2xs shrink-0 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${colorClass}`}>{value}</p>
      {sub && <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  )
}