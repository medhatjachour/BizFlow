import { PawPrint, Users, Activity, TrendingUp, AlertCircle, CalendarClock } from 'lucide-react'
import { VetOverviewStats } from '../types'
import { formatCurrency, formatCompactNumber } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface OverviewKpiCardsProps {
  overview: VetOverviewStats
}

export function OverviewKpiCards({ overview }: OverviewKpiCardsProps) {
  const { t } = useLanguage()

  const cards = [
    {
      label: t('vetTotalPatients') || 'Total Patients',
      value: formatCompactNumber(overview.totalPatients),
      icon: PawPrint,
      tone: 'text-violet-600 dark:text-violet-400',
      bgGlow: 'from-violet-500/10'
    },
    {
      label: t('vetNewPatients') || 'New Patients',
      value: formatCompactNumber(overview.newPatients),
      icon: Users,
      tone: 'text-blue-600 dark:text-blue-400',
      bgGlow: 'from-blue-500/10'
    },
    {
      label: t('vetTotalSessions') || 'Sessions',
      value: formatCompactNumber(overview.sessionCount),
      icon: Activity,
      tone: 'text-teal-600 dark:text-teal-400',
      bgGlow: 'from-teal-500/10'
    },
    {
      label: t('vetRevenue') || 'Revenue',
      value: formatCurrency(overview.revenue),
      icon: TrendingUp,
      tone: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'from-emerald-500/10'
    },
    {
      label: t('vetOutstanding') || 'Outstanding',
      value: formatCurrency(overview.outstanding),
      icon: AlertCircle,
      tone: overview.outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400',
      bgGlow: overview.outstanding > 0 ? 'from-rose-500/10' : 'from-slate-500/5'
    },
    {
      label: t('vetUpcomingAppts') || 'Upcoming Appts',
      value: formatCompactNumber(overview.upcomingAppts),
      icon: CalendarClock,
      tone: 'text-sky-600 dark:text-sky-400',
      bgGlow: 'from-sky-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-gradient-to-b ${card.bgGlow} to-white dark:to-slate-800/80 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{card.label}</span>
              <Icon className={`h-4 w-4 ${card.tone}`} />
            </div>
            <p className={`text-xl font-black tracking-tight ${card.tone}`}>{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}