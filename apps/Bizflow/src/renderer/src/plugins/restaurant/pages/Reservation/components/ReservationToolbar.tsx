import React from 'react'
import {
  Search,
  Plus,
  RefreshCw,

} from 'lucide-react'
import { ReservationStatus } from '../types'
import { RESERVATION_STATUS_CONFIG } from '../constants'

interface Props {
  filterDate: string
  onDateChange: (date: string) => void
  statusFilter: ReservationStatus | 'ALL'
  onStatusChange: (status: ReservationStatus | 'ALL') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: 'list' | 'timeline'
  onToggleViewMode: (mode: 'list' | 'timeline') => void
  stats: {
    total: number
    confirmed: number
    seated: number
    pending: number
    completed: number
    totalGuests: number
  }
  onOpenAddModal: () => void
  onRefresh: () => void
  loading: boolean
}

export const ReservationToolbar: React.FC<Props> = ({
  filterDate,
  onDateChange,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  stats,
  onOpenAddModal,
  onRefresh,
  loading
}) => {
  const handlePrevDay = () => {
    const d = new Date(filterDate)
    d.setDate(d.getDate() - 1)
    onDateChange(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(filterDate)
    d.setDate(d.getDate() + 1)
    onDateChange(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    onDateChange(new Date().toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-3">
      {/* Top Controls: Date Stepper, Search, Mode Toggle & New Booking */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        {/* Date Selector with Day Stepper */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="px-3 py-1 text-2xl rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold"
          >
            ‹
          </button>
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handleNextDay}
            className="px-3 py-1 text-2xl rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-bold"
          >
            ›
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-100"
          >
            Today
          </button>
        </div>

        {/* Search, View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guest or table..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-36 sm:w-48 font-medium"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-orange-500/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Metric Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => onStatusChange('ALL')}
          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-2xs'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
          }`}
        >
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">All Bookings</span>
          <span className="text-xs font-black text-slate-900 dark:text-white">{stats.total}</span>
        </button>

        {(['confirmed', 'seated', 'pending', 'completed'] as ReservationStatus[]).map((st) => {
          const cfg = RESERVATION_STATUS_CONFIG[st]
          return (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === st
                  ? `${cfg.bg} ring-1 ring-amber-500/30 shadow-2xs`
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{cfg.label}</span>
              </div>
              <span className={`text-xs font-black ${cfg.text}`}>{stats[st]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}