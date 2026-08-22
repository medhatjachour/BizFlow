import React from 'react'
import { Search, UserCheck, User, ShieldCheck } from 'lucide-react'
import { GymSessionRecord, SessionFilterOptions, SessionType } from '../types'
import { SESSION_TYPE_CONFIG } from '../constants'
import { formatCurrency, formatSessionTime } from '../utils'

interface Props {
  sessions: GymSessionRecord[]
  filters: SessionFilterOptions
  onFiltersChange: React.Dispatch<React.SetStateAction<SessionFilterOptions>>
}

export const DailySessionsTable: React.FC<Props> = ({
  sessions,
  filters,
  onFiltersChange
}) => {
  const typeFilterList: { label: string; value: 'all' | SessionType }[] = [
    { label: 'All Sessions', value: 'all' },
    { label: 'Walk-ins', value: 'walkin' },
    { label: 'Subscriptions', value: 'subscription' },
    { label: 'PT / Coaching', value: 'pt' }
  ]

  return (
    <div className="bg-white dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
      {/* Table Filter / Search Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Daily Session Log & Attendance Audits
          </h3>
          <p className="text-xs text-slate-400">
            Recorded check-ins with assigned coach and transaction balances
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Member/Coach */}
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search member or coach..."
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Quick Type Filter dropdown / pills */}
          <select
            value={filters.type}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, type: e.target.value as 'all' | SessionType }))
            }
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {typeFilterList.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions Row View */}
      {sessions.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-96 overflow-y-auto">
          {sessions.map((s) => {
            const { date, time } = formatSessionTime(s.date)
            const typeConfig = SESSION_TYPE_CONFIG[s.type] ?? SESSION_TYPE_CONFIG.subscription

            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors text-xs"
              >
                {/* Left: Timestamp + Type Badge + Trainee */}
                <div className="flex items-center gap-3.5">
                  <div className="text-left w-14">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{time}</span>
                    <span className="text-[10px] text-slate-400">{date}</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeConfig.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dotClass}`} />
                    {typeConfig.label}
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase">
                      {s.trainee?.name ? s.trainee.name.charAt(0) : <User size={11} />}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {s.trainee?.name ?? <span className="text-slate-400 italic">Guest Walk-In</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Coach + Collected Amount */}
                <div className="flex items-center gap-5">
                  {s.coach && (
                    <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <ShieldCheck size={13} className="text-orange-500" />
                      <span>{s.coach.name}</span>
                    </div>
                  )}

                  <div className="text-right min-w-[70px]">
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {s.amount > 0 ? formatCurrency(s.amount) : <span className="text-slate-400 font-normal">Included</span>}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <UserCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            No session activity found
          </p>
          <p className="text-[11px] text-slate-400">
            Try adjusting your search criteria or choosing a different date.
          </p>
        </div>
      )}
    </div>
  )
}