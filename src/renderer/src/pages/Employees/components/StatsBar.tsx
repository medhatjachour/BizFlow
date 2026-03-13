import { Users, UserCheck, UserX, Clock, CheckCircle, BarChart2, TrendingUp } from 'lucide-react'
import type { EmployeeStats } from '../types'

interface Props {
  stats: EmployeeStats
}

export default function StatsBar({ stats }: Props) {
  const items = [
    { label: 'Total', value: stats.total, icon: <Users size={20} />, color: 'text-blue-500' },
    { label: 'Active', value: stats.active, icon: <UserCheck size={20} />, color: 'text-green-500' },
    { label: 'On Leave', value: stats.onLeave, icon: <Clock size={20} />, color: 'text-amber-500' },
    { label: 'Terminated', value: stats.terminated, icon: <UserX size={20} />, color: 'text-red-500' },
    { label: 'Present Today', value: stats.presentToday, icon: <CheckCircle size={20} />, color: 'text-emerald-500' },
    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: <BarChart2 size={20} />, color: 'text-purple-500' },
    { label: 'Payroll/Month', value: `$${stats.payrollThisMonth.toFixed(0)}`, icon: <TrendingUp size={20} />, color: 'text-indigo-500' }
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
