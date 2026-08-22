import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { formatLongDate, offsetDate, getTodayString } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DateNavigatorProps {
  selectedDate: string
  onDateChange: (dateStr: string) => void
}

export function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const { t } = useLanguage()
  const today = getTodayString()
  const isToday = selectedDate === today

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDateChange(offsetDate(selectedDate, -1))}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all active:scale-95"
          title="Previous day"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => onDateChange(offsetDate(selectedDate, 1))}
          disabled={isToday}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          title="Next day"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <CalendarIcon size={14} className="text-orange-500" />
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {formatLongDate(selectedDate)}
        </span>
        {isToday && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            Today
          </span>
        )}
      </div>

      <div>
        {!isToday && (
          <button
            onClick={() => onDateChange(today)}
            className="px-3 py-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm transition-all active:scale-95"
          >
            {t('gymToday') || 'Jump to Today'}
          </button>
        )}
      </div>
    </div>
  )
}