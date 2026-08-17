import React from 'react'
import { Calendar, Clock, Plus, Pencil } from 'lucide-react'
import { startOfToday } from '../utils'
import { APPOINTMENT_STATUS_CONFIG, APPOINTMENT_TYPE_CONFIG, VISIT_TYPE_CONFIG, DEFAULT_DOT_CLS } from '../constants'
import type { Appointment, Session } from '../types'

interface Props {
  appointments: Appointment[]
  sessions: Session[]
  onBookAppointment: () => void
  onEditAppointment: (appt: Appointment) => void
}

export const UpcomingScheduleGrid: React.FC<Props> = ({
  appointments,
  sessions,
  onBookAppointment,
  onEditAppointment
}) => {
  const today = startOfToday()

  const upcomingAppointments = appointments
    .filter((a) => new Date(a.appointmentDate).getTime() >= today.getTime())
    .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

  const upcomingFollowUps = sessions
    .filter((s) => !!s.followUpDate && s.status !== 'completed')
    .filter((s) => new Date(s.followUpDate as string).getTime() >= today.getTime())
    .sort((a, b) => new Date(a.followUpDate as string).getTime() - new Date(b.followUpDate as string).getTime())

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Appointments Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-teal-50/40 dark:bg-teal-950/10">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming Appointments</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold">
              {upcomingAppointments.length}
            </span>
          </div>
          <button
            onClick={onBookAppointment}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Book
          </button>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-slate-400">
            <Calendar className="h-7 w-7 text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No upcoming appointments</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {upcomingAppointments.slice(0, 5).map((appt) => {
              const statusCfg = APPOINTMENT_STATUS_CONFIG[appt.status] ?? {
                label: appt.status,
                cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }
              return (
                <div
                  key={appt.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{APPOINTMENT_TYPE_CONFIG[appt.type] ?? appt.type}</span>
                      {appt.duration && <span>• {appt.duration} min</span>}
                      {appt.doctorName && <span>• Dr. {appt.doctorName}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onEditAppointment(appt)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Follow-ups Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-sky-50/40 dark:bg-sky-950/10">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming Follow-ups</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold">
              {upcomingFollowUps.length}
            </span>
          </div>
        </div>

        {upcomingFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-slate-400">
            <Clock className="h-7 w-7 text-slate-300 dark:text-slate-600" />
            <p className="text-xs">No upcoming follow-up reminders</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {upcomingFollowUps.slice(0, 5).map((session) => {
              const visitCfg = VISIT_TYPE_CONFIG[session.visitType] ?? {
                label: session.visitType,
                cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                dotCls: DEFAULT_DOT_CLS
              }
              return (
                <div key={session.id} className="px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {new Date(session.followUpDate as string).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${visitCfg.cls}`}>
                      {visitCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {session.diagnosis || session.chiefComplaint || 'Follow-up clinical inspection'}
                  </p>
                  {session.doctorName && <p className="text-[11px] text-slate-400 mt-0.5">Dr. {session.doctorName}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}