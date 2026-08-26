import { VetAppointmentRecord } from '../types'
import { getWeekDatesList, toIsoDateString, formatApptTime } from '../utils'
import { STATUS_CONFIG } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  selectedDate: string
  weekMap: Record<string, VetAppointmentRecord[]>
  onSelectDay: (d: string) => void
  onSelectAppointment: (a: VetAppointmentRecord) => void
}

export function AppointmentWeekCalendar({
  selectedDate,
  weekMap,
  onSelectDay,
  onSelectAppointment
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const weekDays = getWeekDatesList(selectedDate)
  const todayStr = toIsoDateString(new Date())

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
      {weekDays.map((dayStr) => {
        const dayAppts = weekMap[dayStr] ?? []
        const dateObj = new Date(dayStr + 'T00:00:00')
        const isToday = dayStr === todayStr
        const isSelected = dayStr === selectedDate

        return (
          <div
            key={dayStr}
            onClick={() => onSelectDay(dayStr)}
            className={`rounded-3xl border p-3 flex flex-col justify-between cursor-pointer transition-all shadow-sm ${
              isSelected
                ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-500 shadow-md ring-2 ring-violet-500/20'
                : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-violet-300'
            }`}
          >
            {/* Day Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2 mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    {dateObj.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-base font-black ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-slate-800 dark:text-white'}`}>
                    {dateObj.getDate()}
                  </p>
                </div>
                {dayAppts.length > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80">
                    {dayAppts.length}
                  </span>
                )}
              </div>

              {/* Slot Cards List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {dayAppts.slice(0, 5).map((a) => {
                  const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled
                  return (
                    <div
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectAppointment(a)
                      }}
                      className={`p-1.5 rounded-xl border text-[10px] font-semibold transition-all hover:scale-[1.02] ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{formatApptTime(a.appointmentDate)}</span>
                        <span className="truncate max-w-[80px]">{a.patient?.name || 'Pet'}</span>
                      </div>
                    </div>
                  )
                })}
                {dayAppts.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center font-bold pt-1">
                    +{dayAppts.length - 5} {isAr ? 'مواعيد أخرى' : 'more'}
                  </p>
                )}
                {dayAppts.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-6">
                    {isAr ? 'متاح' : 'Free'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}