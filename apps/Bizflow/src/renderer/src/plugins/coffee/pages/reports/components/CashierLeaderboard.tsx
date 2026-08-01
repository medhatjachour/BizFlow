import { Trophy, Crown, Medal, Award } from 'lucide-react'
import { Overview } from '../types'
import { formatCurrency } from '../utils'

interface CashierLeaderboardProps {
  overview: Overview | null
  loading: boolean
  t: (key: string) => string
}

const RANK_ICONS = [
  { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-500/20' },
  { icon: Award, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-500/20' },
]

export function CashierLeaderboard({ overview, loading, t }: CashierLeaderboardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const cashiers = overview?.topCashiers ?? []

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('cfTopCashiers')}</h3>
      </div>

      {cashiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <Trophy className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No cashier data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cashiers.map((cashier, idx) => {
            const rankConfig = RANK_ICONS[idx] ?? null
            const RankIcon = rankConfig?.icon

            return (
              <div
                key={`${cashier.id}-${idx}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border border-amber-200 dark:border-amber-500/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center font-bold relative">
                  {RankIcon ? (
                    <RankIcon className={`h-5 w-5 ${rankConfig?.color}`} />
                  ) : (
                    <span className="text-sm">{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{cashier.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cashier.orders} {t('cfOrdersLc')} • Avg {formatCurrency(cashier.avgOrderValue || cashier.revenue / cashier.orders)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(cashier.revenue)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
