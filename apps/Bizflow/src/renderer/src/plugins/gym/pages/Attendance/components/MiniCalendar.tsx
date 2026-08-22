import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CalendarData } from '../types'
import { buildCalendarMatrix, getTodayString } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface MiniCalendarProps {
  calMonth: { year: number; month: number }
  selectedDate: string
  calData: CalendarData
  onMonthChange: (delta: number) => void
  onDateSelect: (dateStr: string) => void
}

export function MiniCalendar({
  calMonth,
  selectedDate,
  calData,
  onMonthChange,
  onDateSelect
}: MiniCalendarProps) {
  const { t } = useLanguage()
  const today = getTodayString()
  const weeks = buildCalendarMatrix(calMonth.year, calMonth.month)
  const monthName = new Date(calMonth.year, calMonth.month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm h-fit">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between mb-3.5">
        <button
          onClick={() => onMonthChange(-1)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-bold text-slate-800 dark:text-white">{monthName}</span>
        <button
          onClick={() => onMonthChange(1)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-slate-400 py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="space-y-1">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dIdx) => {
              if (!day) return <div key={dIdx} className="h-9" />

              const dayNumber = parseInt(day.slice(8))
              const count = calData[day]?.total ?? 0
              const isSelected = day === selectedDate
              const isTodayDay = day === today
              const isFuture = day > today

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isFuture}
                  onClick={() => onDateSelect(day)}
                  className={`h-9 rounded-xl flex flex-col items-center justify-center text-[11px] transition-all relative ${
                    isSelected
                      ? 'bg-orange-500 text-white font-bold shadow-sm ring-2 ring-orange-500/30'
                      : isTodayDay
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30'
                      : isFuture
                      ? 'text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium'
                  }`}
                >
                  <span className="leading-none">{dayNumber}</span>
                  {count > 0 && (
                    <span
                      className={`text-[8px] font-extrabold leading-none mt-0.5 ${
                        isSelected ? 'text-white/90' : 'text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
        {t('gymDailyNumbers') || 'Numbers show total daily check-ins'}
      </p>
    </div>
  )
}