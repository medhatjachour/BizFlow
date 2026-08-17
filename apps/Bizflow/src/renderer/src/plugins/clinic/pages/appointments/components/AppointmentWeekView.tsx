import React from 'react'
import { toIsoDate, getWeekDates } from '../utils'
import type { Appointment } from '../types'

interface Props {
  selectedDate: string
  weekAppts: Record<string, Appointment[]>
  onSelectDay: (day: string) => void
}

export const AppointmentWeekView: React.FC<Props> = ({ selectedDate, weekAppts, onSelectDay }) => {
  const weekDays = getWeekDates(selectedDate)
  const todayIso = toIsoDate(new Date())

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {weekDays.map((day) => {
        const dayAppts = weekAppts[day] ?? []
        const dayObj = new Date(day + 'T00:00:00')
        const isCurrentDay = day === todayIso
        const isSelected = day === selectedDate

        return (
          <div
            key={day}
            onClick={() => onSelectDay(day)}
            className={`rounded-2xl border p-2 cursor-pointer transition-all hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-sm ${
              isSelected
                ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 ring-2 ring-teal-500/20'
                : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800'
            }`}
          >
            {/* Day Header */}
            <div className={`text-center pb-2 border-b ${isSelected ? 'border-teal-200 dark:border-teal-800' : 'border-slate-100 dark:border-slate-700'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {dayObj.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className={`text-lg font-extrabold block leading-tight ${isCurrentDay ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {dayObj.getDate()}
              </span>
              {dayAppts.length > 0 && (
                <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                  {dayAppts.length}
                </span>
              )}
            </div>

            {/* Appointment Chips */}
            <div className="pt-2 space-y-1 max-h-36 overflow-y-auto [scrollbar-width:none]">
              {dayAppts.slice(0, 4).map((appt) => (
                <div
                  key={appt.id}
                  className={`text-[10px] px-1.5 py-1 rounded-lg truncate font-medium ${
                    ['scheduled', 'confirmed'].includes(appt.status)
                      ? 'bg-teal-100/70 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                  title={`${new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} — ${appt.patient.name}`}
                >
                  {new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} {appt.patient.name}
                </div>
              ))}
              {dayAppts.length > 4 && (
                <div className="text-[10px] text-slate-400 text-center font-medium">
                  +{dayAppts.length - 4} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}