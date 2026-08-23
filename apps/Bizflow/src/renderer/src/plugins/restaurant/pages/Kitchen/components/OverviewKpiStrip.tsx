import React from 'react'
import { Table2, DollarSign, Flame, CalendarDays } from 'lucide-react'
import { OverviewMetrics } from '../types'

interface Props {
  metrics: OverviewMetrics
  activeTicketsCount: number
  onNavigate?: (tab: string) => void
}

export const OverviewKpiStrip: React.FC<Props> = ({ metrics, activeTicketsCount, onNavigate }) => {
  const occupancyRate =
    metrics.totalTables > 0
      ? Math.round(((metrics.occupied + metrics.billing) / metrics.totalTables) * 100)
      : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Dining Tables */}
      <button
        onClick={() => onNavigate?.('floor')}
        className="text-left p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Table2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40">
            {occupancyRate}% Occupancy
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {metrics.occupied + metrics.billing}/{metrics.totalTables}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Active Dining Tables</div>
      </button>

      {/* Gross Settled Sales */}
      <button
        onClick={() => onNavigate?.('pos')}
        className="text-left p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40">
            Today
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          ${metrics.todayRevenue.toFixed(2)}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Gross Settled Sales</div>
      </button>

      {/* Live KDS Queue */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40">
            Active Prep
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {activeTicketsCount} Orders
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Orders on Kitchen Rail</div>
      </div>

      {/* Reservations */}
      <button
        onClick={() => onNavigate?.('reservations')}
        className="text-left p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40">
            Bookings
          </span>
        </div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {metrics.todayReservations}
        </div>
        <div className="text-xs font-semibold text-slate-400 mt-0.5">Today's Reservations</div>
      </button>
    </div>
  )
}