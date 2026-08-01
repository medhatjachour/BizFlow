import { LucideIcon } from 'lucide-react'
import { StatTone } from '../types'
import { STAT_TONE_CONFIG } from '../constants'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  description?: string
  icon: LucideIcon
  tone: StatTone
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
}

export function StatCard({ label, value, sub,description, icon: Icon, tone, trend, loading }: StatCardProps) {
  const config = STAT_TONE_CONFIG[tone]

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${config.border} bg-gradient-to-br ${config.gradient} bg-white dark:bg-slate-800 p-5 transition-all duration-300 hover:shadow-lg ${config.glow} hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${config.text} tabular-nums tracking-tight`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>}
          {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>}
          
          {trend && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
              <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-slate-400">vs prev</span>
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 p-2.5 rounded-xl ${config.iconBg}`}>
          <Icon className={`h-6 w-6 ${config.text}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
