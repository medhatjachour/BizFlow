import { Lock, Unlock, ShieldCheck, PieChart } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface LockerStatsStripProps {
  total: number
  occupied: number
  available: number
  occupancyRate: number
}

export function LockerStatsStrip({
  total,
  occupied,
  available,
  occupancyRate
}: LockerStatsStripProps) {
  const { t } = useLanguage()

  const stats = [
    {
      label: t('gymTotal') || 'Total Lockers',
      value: total,
      icon: ShieldCheck,
      color: 'text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800'
    },
    {
      label: t('gymAvailable') || 'Available',
      value: available,
      icon: Unlock,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: t('gymOccupied') || 'Occupied',
      value: occupied,
      icon: Lock,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      icon: PieChart,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                {s.value}
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl ${s.color}`}>
              <Icon size={18} />
            </div>
          </div>
        )
      })}
    </div>
  )
}