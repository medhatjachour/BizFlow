import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, RefreshCcw, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { GymDashboardOverview } from '../types'

interface Props {
  stats: GymDashboardOverview | null
  loading: boolean
  onRefresh: () => void
}

export const DashboardHeader: React.FC<Props> = ({ stats, loading, onRefresh }) => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 rounded-xl border border-orange-500/20 text-orange-600 dark:text-orange-400">
          <Dumbbell size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('gymTitle') ?? 'Gym Operations Hub'}
            </h2>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats
              ? `${stats.todayCheckIns} ${t('gymTodayCheckIns')?.toLowerCase() ?? 'today check-ins'} · ${stats.activeMembers} ${t('gymActiveMembers')?.toLowerCase() ?? 'active members'}`
              : 'Synchronizing hub parameters…'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/gym')}
          className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
        >
          <span>{t('gymOpenGym') ?? 'Launch Gym Engine'}</span>
          <ArrowUpRight size={13} />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Dashboard"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin text-orange-500' : ''} />
        </button>
      </div>
    </div>
  )
}