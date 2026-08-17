import React from 'react'
import {
  Users,
  Activity,
  ClipboardList,
  UserPlus,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import type { ClinicOverview, TrendDirection } from '../types'

interface Props {
  overview: ClinicOverview
  collectionRate: number
  sessionsTrendDir: TrendDirection
  sessionsTrendPct: number
  revenueTrendDir: TrendDirection
  revenueTrendPct: number
}

export const StatsKpiGrid: React.FC<Props> = ({
  overview,
  collectionRate,
  sessionsTrendDir,
  sessionsTrendPct,
  revenueTrendDir,
  revenueTrendPct
}) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {/* 1. Total Patients */}
      <KpiCard
        icon={Users}
        label={t('totalPatients') || 'Total Patients'}
        value={overview.totalPatients}
        color="bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400"
      />

      {/* 2. Today's Sessions */}
      <KpiCard
        icon={Activity}
        label={t('todaySessions') || "Today's Sessions"}
        value={overview.todaySessions}
        color="bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"
      />

      {/* 3. Monthly Sessions */}
      <KpiCard
        icon={ClipboardList}
        label={t('sessionsThisMonth') || 'Sessions (Mo.)'}
        value={overview.sessionsThisMonth}
        color="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
        trend={sessionsTrendDir}
        trendPct={sessionsTrendPct}
      />

      {/* 4. New Registrations */}
      <KpiCard
        icon={UserPlus}
        label={t('newPatientsMonth') || 'New Patients'}
        value={overview.newPatientsThisMonth}
        color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
      />

      {/* 5. Follow-ups Due */}
      <KpiCard
        icon={Calendar}
        label={t('followUpsDue') || 'Follow-ups Due'}
        value={overview.followUpsDue}
        color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
        trend={overview.followUpsDue > 5 ? 'up' : 'flat'}
      />

      {/* 6. Revenue This Month */}
      <KpiCard
        icon={DollarSign}
        label={t('revenueThisMonth') || 'Revenue (Mo.)'}
        value={formatCurrency(overview.revenueThisMonth)}
        color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
        trend={revenueTrendDir}
        trendPct={revenueTrendPct}
      />

      {/* 7. Outstanding Receivables */}
      <KpiCard
        icon={AlertCircle}
        label={t('outstandingBalanceCard') || 'Outstanding'}
        value={formatCurrency(overview.outstandingThisMonth)}
        color="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
        sub={`${t('collectionRate') || 'Collection'}: ${collectionRate}%`}
      />
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  trend,
  trendPct
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  sub?: string
  trend?: TrendDirection
  trendPct?: number
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 flex flex-col justify-between shadow-xs transition-all hover:border-teal-300">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && trend !== 'flat' && trendPct !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trendPct)}%
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight truncate">
          {value}
        </div>
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">{label}</div>
        {sub && <div className="text-[10px] font-bold text-slate-400 mt-1 truncate">{sub}</div>}
      </div>
    </div>
  )
}