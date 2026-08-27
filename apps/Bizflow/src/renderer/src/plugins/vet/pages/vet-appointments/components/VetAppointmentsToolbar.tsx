import {
   Plus, ChevronLeft, ChevronRight, RefreshCw,
  LayoutGrid, List, Table, Search, X
} from 'lucide-react'
import { AppointmentViewMode } from '../types'
import { APPT_TYPES, STATUS_CONFIG } from '../constants'
import { shiftDateDays, toIsoDateString } from '../utils'
import { AppointmentHelpTooltip } from './AppointmentHelpTooltip'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  selectedDate: string
  onDateChange: (d: string) => void
  viewMode: AppointmentViewMode
  onViewModeChange: (m: AppointmentViewMode) => void
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
  doctorFilter: string
  onDoctorFilterChange: (v: string) => void
  attendingDoctors: string[]
  onBookAppointment: () => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function VetAppointmentsToolbar({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  doctorFilter,
  onDoctorFilterChange,
  attendingDoctors,
  onBookAppointment,
  onRefresh,
  isRefreshing
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const isToday = selectedDate === toIsoDateString(new Date())

  return (
    <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
      {/* Row 1: Date Navigation, Today shortcut & Book Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Previous Date */}
          <button
            type="button"
            onClick={() => onDateChange(shiftDateDays(selectedDate, viewMode === 'week' ? -7 : -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" />
          </button>

          <DateField
            value={selectedDate}
            onChange={(v) => onDateChange(v)}
            wrapperClassName="w-44"
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          />

          {/* Next Date */}
          <button
            type="button"
            onClick={() => onDateChange(shiftDateDays(selectedDate, viewMode === 'week' ? 7 : 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <ChevronRight size={16} className="rtl:rotate-180" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(toIsoDateString(new Date()))}
              className="px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 rounded-xl border border-violet-200 dark:border-violet-800 transition-all"
            >
              {isAr ? 'اليوم' : 'Today'}
            </button>
          )}

          <AppointmentHelpTooltip />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all disabled:opacity-50"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-violet-500' : ''} />
          </button>

          <button
            type="button"
            onClick={onBookAppointment}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>{isAr ? 'حجز موعد جديد' : 'Book Appointment'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Search, Filters & View Mode Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isAr ? 'بحث بالمريض، المالك، الطبيب...' : 'Search patient, owner, doctor...'}
              className="w-full pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>
                {isAr ? cfg.labelAr : cfg.labelEn}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="all">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            {APPT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {isAr ? t.labelAr : t.labelEn}
              </option>
            ))}
          </select>

          {/* Doctor Filter */}
          {attendingDoctors.length > 0 && (
            <select
              value={doctorFilter}
              onChange={(e) => onDoctorFilterChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="all">{isAr ? 'جميع الأطباء' : 'All Doctors'}</option>
              {attendingDoctors.map((doc) => (
                <option key={doc} value={doc}>
                  Dr. {doc}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => onViewModeChange('day')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'day'
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={13} />
            <span>{isAr ? 'اليوم' : 'Day'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('week')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={13} />
            <span>{isAr ? 'الأسبوع' : 'Week'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table size={13} />
            <span>{isAr ? 'الجدول' : 'Table'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}