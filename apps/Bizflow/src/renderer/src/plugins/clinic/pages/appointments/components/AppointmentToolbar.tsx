import React from 'react'
import { ChevronLeft, ChevronRight, List, LayoutGrid, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { shiftDay, toIsoDate } from '../utils'

interface Props {
  selectedDate: string
  viewMode: 'day' | 'week'
  onSelectDate: (date: string) => void
  onSelectViewMode: (mode: 'day' | 'week') => void
  onOpenBooking: () => void
}

export const AppointmentToolbar: React.FC<Props> = ({
  selectedDate,
  viewMode,
  onSelectDate,
  onSelectViewMode,
  onOpenBooking
}) => {
  const { t } = useLanguage()
  const isToday = selectedDate === toIsoDate(new Date())

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
      {/* Date Navigation & View Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-0.5">
          <button
            onClick={() => onSelectDate(shiftDay(selectedDate, viewMode === 'week' ? -7 : -1))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="px-2.5 py-1 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <button
            onClick={() => onSelectDate(shiftDay(selectedDate, viewMode === 'week' ? 7 : 1))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!isToday && (
          <button
            onClick={() => onSelectDate(toIsoDate(new Date()))}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-all shadow-xs"
          >
            {t('todayBadge')}
          </button>
        )}

        {/* View Toggle */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-0.5">
          <button
            onClick={() => onSelectViewMode('day')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'day'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" /> Day
          </button>
          <button
            onClick={() => onSelectViewMode('week')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Week
          </button>
        </div>
      </div>

      {/* Book CTA */}
      <button
        onClick={onOpenBooking}
        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shadow-teal-500/20"
      >
        <Plus className="h-4 w-4" /> {t('bookAppointment')}
      </button>
    </div>
  )
}