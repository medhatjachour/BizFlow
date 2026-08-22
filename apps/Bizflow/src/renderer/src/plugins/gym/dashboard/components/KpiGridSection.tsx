import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarX,
  Footprints,
  TrendingUp,
  UserCheck,
  ClipboardList,
  Lock,
  AlertTriangle,
  ArrowRight,
  LucideIcon
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { GymDashboardOverview } from '../types'
import { formatCompactNumber } from '../utils'

interface Props {
  stats: GymDashboardOverview
  atRiskCount: number
}

interface StatItem {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  color: string
  bg: string
  border: string
  route?: string
}

export const KpiGridSection: React.FC<Props> = ({ stats, atRiskCount }) => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const isNetPositive = stats.netIncome >= 0

  const cards: StatItem[] = [
    {
      icon: Users,
      label: 'Active Members',
      value: stats.activeMembers,
      sub: 'Valid memberships',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50/70 dark:bg-orange-950/20',
      border: 'border-orange-200/70 dark:border-orange-800/40',
      route: '/gym/members'
    },
    {
      icon: CalendarX,
      label: 'Expiring This Week',
      value: stats.expiringSoon,
      sub: stats.expiringSoon > 0 ? 'Need renewal' : 'All clear ✓',
      color: stats.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400',
      bg: 'bg-amber-50/70 dark:bg-amber-950/20',
      border: 'border-amber-200/70 dark:border-amber-800/40',
      route: '/gym/subscriptions'
    },
    {
      icon: Footprints,
      label: "Today's Check-ins",
      value: stats.todayCheckIns,
      sub: 'Logged passes',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/70 dark:bg-teal-950/20',
      border: 'border-teal-200/70 dark:border-teal-800/40',
      route: '/gym/attendance'
    },
    {
      icon: TrendingUp,
      label: 'Monthly Revenue',
      value: formatCompactNumber(stats.revenue),
      sub: `Net ${formatCompactNumber(stats.netIncome)}`,
      color: isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
      border: 'border-emerald-200/70 dark:border-emerald-800/40',
      route: '/gym/finance'
    },
    {
      icon: UserCheck,
      label: t('gymNewThisMonth') ?? 'New Members',
      value: stats.newMembersThisMonth ?? 0,
      sub: 'Joined this cycle',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50/70 dark:bg-blue-950/20',
      border: 'border-blue-200/70 dark:border-blue-800/40',
      route: '/gym/members'
    },
    {
      icon: ClipboardList,
      label: t('gymActivePrograms') ?? 'Active Programs',
      value: stats.activePrograms ?? 0,
      sub: 'Enrolled routines',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50/70 dark:bg-purple-950/20',
      border: 'border-purple-200/70 dark:border-purple-800/40',
      route: '/gym/programs'
    },
    {
      icon: Lock,
      label: t('gymLockerOccupancy') ?? 'Locker Slots',
      value: stats.totalLockers ? `${stats.occupiedLockers}/${stats.totalLockers}` : '—',
      sub: stats.totalLockers ? `${stats.totalLockers - (stats.occupiedLockers ?? 0)} available` : 'Not configured',
      color: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-50 dark:bg-slate-800/60',
      border: 'border-slate-200/80 dark:border-slate-700/80',
      route: '/gym/lockers'
    },
    {
      icon: AlertTriangle,
      label: t('gymAtRiskMembers') ?? 'At-Risk Members',
      value: atRiskCount,
      sub: 'Inactive 14+ days',
      color: atRiskCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400',
      bg: atRiskCount > 0 ? 'bg-rose-50/70 dark:bg-rose-950/20' : 'bg-slate-50 dark:bg-slate-800/60',
      border: atRiskCount > 0 ? 'border-rose-200/70 dark:border-rose-800/40' : 'border-slate-200/80 dark:border-slate-700/80',
      route: '/gym/members?status=inactive'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            onClick={() => card.route && navigate(card.route)}
            className={`group rounded-2xl border p-3.5 ${card.bg} ${card.border} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Icon size={14} className={card.color} />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                  {card.label}
                </span>
              </div>
              <ArrowRight
                size={11}
                className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            </div>

            <p className={`text-xl font-black tracking-tight tabular-nums ${card.color}`}>
              {card.value}
            </p>
            {card.sub && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">
                {card.sub}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}