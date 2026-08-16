import React from 'react'
import { KPI_COLOR_THEMES } from '../constants'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: keyof typeof KPI_COLOR_THEMES
}

export function KpiCard({ icon, label, value, sub, color = 'gray' }: KpiCardProps) {
  const theme = KPI_COLOR_THEMES[color] ?? KPI_COLOR_THEMES.gray

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border ${theme.border} p-4 sm:p-5 shadow-sm transition-all hover:shadow-md bg-gradient-to-br ${theme.bg}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`p-2 rounded-xl ${theme.iconBg}`}>{icon}</div>
      </div>

      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {value}
      </div>

      {sub && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
          {sub}
        </p>
      )}
    </div>
  )
}