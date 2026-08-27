import { useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { VetAppointmentRecord } from './types'
import { useVetAppointments } from './hooks/useVetAppointments'
import { VetAppointmentsToolbar } from './components/VetAppointmentsToolbar'
import { AppointmentKpiCards } from './components/AppointmentKpiCards'
import { AppointmentCard } from './components/AppointmentCard'
import { AppointmentWeekCalendar } from './components/AppointmentWeekCalendar'
import { AppointmentTableView } from './components/AppointmentTableView'
import { AppointmentDeleteModal } from './components/AppointmentDeleteModal'
import { VetAppointmentFormModal } from './components/VetAppointmentFormModal'
import { VetSessionFormModal } from '../vet-sessions/components/VetSessionFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function VetAppointmentsTab({ onViewPet }: { onViewPet?: (petId: string) => void }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    selectedDate,
    setSelectedDate,
    appointments,
    weekAppointmentsMap,
    metrics,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    updatingId,
    refresh,
    updateStatus,
    deleteAppointment,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    doctorFilter,
    setDoctorFilter,
    attendingDoctors
  } = useVetAppointments()

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<VetAppointmentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VetAppointmentRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Direct Session Starter from Appointment
  const [sessionAppt, setSessionAppt] = useState<VetAppointmentRecord | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteAppointment(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <VetAppointmentsToolbar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        doctorFilter={doctorFilter}
        onDoctorFilterChange={setDoctorFilter}
        attendingDoctors={attendingDoctors}
        onBookAppointment={() => {
          setEditTarget(null)
          setShowForm(true)
        }}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {/* KPI Overview Cards */}
      <AppointmentKpiCards
        metrics={metrics}
        activeFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      {/* Showing count */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{appointments.length}</span>{' '}
          {isAr ? 'حجوزات مسجلة' : 'appointments'}
        </p>
      </div>

      {/* Content Switcher */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل جدول المواعيد...' : 'Loading Appointment Calendar…'}
          </p>
        </div>
      ) : viewMode === 'week' ? (
        <AppointmentWeekCalendar
          selectedDate={selectedDate}
          weekMap={weekAppointmentsMap}
          onSelectDay={(dayStr) => {
            setSelectedDate(dayStr)
            setViewMode('day')
          }}
          onSelectAppointment={(a) => {
            setEditTarget(a)
            setShowForm(true)
          }}
        />
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400 shadow-inner">
            <Calendar size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {isAr ? 'لا توجد مواعيد مسجلة في هذا اليوم' : 'No appointments scheduled for this day'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {isAr ? 'احجز موعداً جديداً للعميل مع تحديد الطبيب المعالج والوقت المناسب' : 'Book a time slot for client consultations, vaccinations, or surgeries'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditTarget(null)
              setShowForm(true)
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md shadow-violet-500/20"
          >
            {isAr ? 'حجز موعد الآن' : 'Book First Appointment'}
          </button>
        </div>
      ) : viewMode === 'day' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              isUpdating={updatingId === a.id}
              onStartSession={() => setSessionAppt(a)}
              onStatusChange={(st) => updateStatus(a.id, st)}
              onEdit={() => {
                setEditTarget(a)
                setShowForm(true)
              }}
              onDelete={() => setDeleteTarget(a)}
              onViewPatient={() => a.patient && onViewPet?.(a.patient.id)}
            />
          ))}
        </div>
      ) : (
        <AppointmentTableView
          appointments={appointments}
          updatingId={updatingId}
          onStartSession={(a) => setSessionAppt(a)}
          onStatusChange={(a, st) => updateStatus(a.id, st)}
          onEdit={(a) => {
            setEditTarget(a)
            setShowForm(true)
          }}
          onDelete={(a) => setDeleteTarget(a)}
          onViewPatient={(a) => a.patient && onViewPet?.(a.patient.id)}
        />
      )}

      {/* Book / Edit Form Modal */}
      {showForm && (
        <VetAppointmentFormModal
          appointment={editTarget}
          onSave={() => {
            setShowForm(false)
            setEditTarget(null)
            refresh()
          }}
          onClose={() => {
            setShowForm(false)
            setEditTarget(null)
          }}
        />
      )}

      {/* Start Session Modal from Appointment */}
      {sessionAppt && (
        <VetSessionFormModal
          preselectedPatient={sessionAppt.patient}
          onSave={async () => {
            const target = sessionAppt
            setSessionAppt(null)
            await updateStatus(target.id, 'completed')
            refresh()
          }}
          onClose={() => setSessionAppt(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AppointmentDeleteModal
        appointment={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}