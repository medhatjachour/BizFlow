import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Calendar, Plus, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useAppointments } from './hooks/useAppointments'
import { toIsoDate } from './utils'
import { AppointmentToolbar } from './components/AppointmentToolbar'
import { AppointmentRow } from './components/AppointmentRow'
import { AppointmentWeekView } from './components/AppointmentWeekView'
import { AppointmentFormModal } from './components/AppointmentFormModal'
import SessionFormModal from '../sessions/components/SessionFormModal'
import type { Appointment } from './types'

export default function AppointmentsTab() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(new Date()))
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [showForm, setShowForm] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [sessionAppt, setSessionAppt] = useState<Appointment | null>(null)

  const {
    appointments,
    weekAppts,
    loading,
    loadingMore,
    hasMore,
    total,
    updatingId,
    loadMore,
    reload,
    deleteAppointment,
    updateStatus
  } = useAppointments(selectedDate, viewMode)

  const pending = appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status))
  const done = appointments.filter((a) => !['scheduled', 'confirmed'].includes(a.status))
  const isToday = selectedDate === toIsoDate(new Date())

  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full">
      {/* Top Toolbar */}
      <AppointmentToolbar
        selectedDate={selectedDate}
        viewMode={viewMode}
        onSelectDate={setSelectedDate}
        onSelectViewMode={setViewMode}
        onOpenBooking={() => {
          setEditingAppt(null)
          setShowForm(true)
        }}
      />

      {/* Week Calendar View */}
      {viewMode === 'week' && (
        <AppointmentWeekView
          selectedDate={selectedDate}
          weekAppts={weekAppts}
          onSelectDay={(day) => {
            setSelectedDate(day)
            setViewMode('day')
          }}
        />
      )}

      {/* Day Header Subtitle */}
      {viewMode === 'day' && (
        <div className="flex items-center gap-2 px-1">
          <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
            {appointments.length} {t('clinicAppointments').toLowerCase()}
          </span>
          {isToday && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold">
              {t('todayBadge')}
            </span>
          )}
        </div>
      )}

      {/* Day Appointments Feed */}
      {viewMode === 'day' &&
        (loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6">
            <Calendar className="h-8 w-8 opacity-30 mb-2" />
            <p className="text-xs font-semibold">{t('noAppointmentsDay')}</p>
            <button
              onClick={() => {
                setEditingAppt(null)
                setShowForm(true)
              }}
              className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> {t('bookOneAppt')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  {t('apptUpcoming')} — {pending.length}
                </p>
                {pending.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    updating={updatingId === appt.id}
                    onEdit={() => {
                      setEditingAppt(appt)
                      setShowForm(true)
                    }}
                    onDelete={() => deleteAppointment(appt.id)}
                    onStatusChange={(status) => updateStatus(appt, status)}
                    onViewPatient={() => navigate(`/clinic/patients/${appt.patientId}`)}
                    onStartSession={() => setSessionAppt(appt)}
                  />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  {t('apptDoneCancelled')} — {done.length}
                </p>
                {done.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appt={appt}
                    updating={updatingId === appt.id}
                    onEdit={() => {
                      setEditingAppt(appt)
                      setShowForm(true)
                    }}
                    onDelete={() => deleteAppointment(appt.id)}
                    onStatusChange={(status) => updateStatus(appt, status)}
                    onViewPatient={() => navigate(`/clinic/patients/${appt.patientId}`)}
                    onStartSession={() => setSessionAppt(appt)}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
                >
                  {loadingMore ? 'Loading...' : `▼ Load more (${appointments.length} of ${total})`}
                </button>
              </div>
            )}
          </div>
        ))}

      {/* Appointment Create/Edit Modal */}
      {showForm && (
        <AppointmentFormModal
          existing={editingAppt}
          defaultDate={selectedDate}
          onClose={() => {
            setShowForm(false)
            setEditingAppt(null)
          }}
          onSaved={(date) => {
            setShowForm(false)
            setEditingAppt(null)
            if (date && date !== selectedDate) setSelectedDate(date)
            else reload()
          }}
        />
      )}

      {/* Session Conversion Modal */}
      {sessionAppt && (
        <SessionFormModal
          defaultAppointment={{
            id: sessionAppt.id,
            appointmentDate: sessionAppt.appointmentDate,
            type: sessionAppt.type,
            doctorName: sessionAppt.doctorName,
            notes: sessionAppt.notes,
            patient: sessionAppt.patient,
            amountCharged: sessionAppt.amountCharged,
            amountPaid: sessionAppt.amountPaid,
            paymentMethod: sessionAppt.paymentMethod
          }}
          onClose={() => setSessionAppt(null)}
          onSaved={() => {
            setSessionAppt(null)
            reload()
          }}
        />
      )}
    </div>
  )
}