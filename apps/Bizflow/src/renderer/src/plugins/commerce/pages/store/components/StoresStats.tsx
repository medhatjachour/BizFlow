import React from 'react'
import { Store, CheckCircle2, XCircle, UserCheck, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { StoreMetrics } from '../types'

interface StoresStatsProps {
  metrics: StoreMetrics
}

export const StoresStats: React.FC<StoresStatsProps> = ({ metrics }) => {
  const { t } = useLanguage()

  const stats = [
    {
      label: t('totalStores') || 'Total Branch Outlets',
      value: metrics.totalStores,
      subtext: `${metrics.activeStores} operational now`,
      icon: <Store className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderClass: 'border-s-4 border-s-emerald-500'
    },
    {
      label: t('activeBranches') || 'Active Registers',
      value: metrics.activeStores,
      subtext: `${metrics.inactiveStores} offline or closed`,
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/50',
      borderClass: 'border-s-4 border-s-indigo-500'
    },
    {
      label: t('branchManagers') || 'Branch Supervisors',
      value: metrics.totalManagers,
      subtext: 'Assigned managers',
      icon: <UserCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      accentBg: 'bg-sky-50 dark:bg-sky-950/50',
      borderClass: 'border-s-4 border-s-sky-500'
    },
    {
      label: t('complianceStatus') || 'Sync Status',
      value: '100%',
      subtext: 'Real-time multi-register sync',
      icon: <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      accentBg: 'bg-amber-50 dark:bg-amber-950/50',
      borderClass: 'border-s-4 border-s-amber-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 shadow-2xs hover:shadow-xs transition-all ${stat.borderClass}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stat.label}
            </span>
            <div className={`p-2 rounded-xl ${stat.accentBg}`}>
              {stat.icon}
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
              {stat.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {stat.subtext}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}