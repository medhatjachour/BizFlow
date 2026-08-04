// features/settings/users-roles/components/UserStatsBar.tsx

import { Users, UserCheck, UserX, Shield } from 'lucide-react'
import type { UserStats } from '../types'
import { getRoleMeta } from '../constants'

export function UserStatsBar({ stats }: { stats: UserStats }) {
  const cards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-600' },
    { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'text-slate-500' },
  ]
  const roleEntries = Object.entries(stats.byRole).slice(0, 5)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</span>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <p className="text-2xl font-semibold mt-1 text-slate-900 dark:text-white">{c.value}</p>
        </div>
      ))}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">By role</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {roleEntries.length === 0 && <span className="text-xs text-slate-400">No users yet</span>}
          {roleEntries.map(([role, count]) => {
            const meta = getRoleMeta(role)
            return (
              <span key={role} className={`text-[11px] px-2 py-0.5 rounded-full ${meta.color}`}>
                {meta.label} · {count}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
