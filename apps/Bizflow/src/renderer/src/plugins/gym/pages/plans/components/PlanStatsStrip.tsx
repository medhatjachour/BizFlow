import { ListChecks, Star, CheckCircle2, DollarSign } from 'lucide-react'
import { Plan } from '../types'

interface PlanStatsStripProps {
  plans: Plan[]
}

export function PlanStatsStrip({ plans }: PlanStatsStripProps) {
  const activeCount = plans.filter(p => p.isActive).length
  const popularCount = plans.filter(p => p.isPopular).length
  const avgPrice =
    plans.length > 0 ? plans.reduce((acc, p) => acc + p.price, 0) / plans.length : 0

  const stats = [
    {
      label: 'Configured Packages',
      value: plans.length,
      icon: ListChecks,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
    },
    {
      label: 'Active for Enrollment',
      value: activeCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'Featured / Popular',
      value: popularCount,
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
    },
    {
      label: 'Average Price',
      value: `$${avgPrice.toFixed(0)}`,
      icon: DollarSign,
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