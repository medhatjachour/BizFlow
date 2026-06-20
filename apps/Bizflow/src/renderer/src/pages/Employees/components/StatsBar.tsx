import { Users, UserCheck, UserX, Clock, CheckCircle, BarChart2, TrendingUp } from 'lucide-react'
import type { EmployeeStats } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  stats: EmployeeStats
}

export default function StatsBar({ stats }: Props) {
  const { t } = useLanguage()
  const items = [
    { label: t('empTotal'), value: stats.total, icon: <Users size={20} />, color: 'text-blue-500' },
    { label: t('empActive'), value: stats.active, icon: <UserCheck size={20} />, color: 'text-green-500' },
    { label: t('empOnLeaveCount'), value: stats.onLeave, icon: <Clock size={20} />, color: 'text-amber-500' },
    { label: t('empTerminatedCount'), value: stats.terminated, icon: <UserX size={20} />, color: 'text-red-500' },
    { label: t('empPresentToday'), value: stats.presentToday, icon: <CheckCircle size={20} />, color: 'text-emerald-500' },
    { label: t('empAttendanceRate'), value: `${stats.attendanceRate}%`, icon: <BarChart2 size={20} />, color: 'text-purple-500' },
    { label: t('empPayrollMonth'), value: `$${stats.payrollThisMonth.toFixed(0)}`, icon: <TrendingUp size={20} />, color: 'text-indigo-500' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
      {items.map(s => (
        <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className={`${s.color} mb-1`}>{s.icon}</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
