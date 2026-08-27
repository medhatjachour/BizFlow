import { useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { VetFollowUpRecord } from './types'
import { useVetFollowUps } from './hooks/useVetFollowUps'
import { FollowUpToolbar } from './components/FollowUpToolbar'
import { FollowUpKpiCards } from './components/FollowUpKpiCards'
import { FollowUpCard } from './components/FollowUpCard'
import { FollowUpTableView } from './components/FollowUpTableView'
import { RescheduleFollowUpModal } from './components/RescheduleFollowUpModal'

import { VetSessionFormModal } from '../vet-sessions/components/VetSessionFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VetAppointmentFormModal } from '../vet-appointments/components/VetAppointmentFormModal'

export default function VetFollowUpsTab({ onViewPet }: { onViewPet?: (petId: string) => void }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const {
    filteredList,
    paginatedList,
    metrics,
    totalPages,
    page,
    setPage,
    filter,
    setFilter,
    search,
    setSearch,
    doctorFilter,
    setDoctorFilter,
    attendingDoctors,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    clearingId,
    refresh,
    markDone,
    reschedule
  } = useVetFollowUps()

  // Modal actions
  const [bookingFor, setBookingFor] = useState<VetFollowUpRecord | null>(null)
  const [walkInFor, setWalkInFor] = useState<VetFollowUpRecord | null>(null)
  const [reschedulingFor, setReschedulingFor] = useState<VetFollowUpRecord | null>(null)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <FollowUpToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        doctorFilter={doctorFilter}
        onDoctorFilterChange={setDoctorFilter}
        attendingDoctors={attendingDoctors}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {/* KPI Cards */}
      <FollowUpKpiCards
        metrics={metrics}
        activeFilter={filter}
        onSelectFilter={(f) => {
          setFilter(f)
          setPage(1)
        }}
      />

      {/* Count Info */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
        <p>
          {isAr ? 'عرض' : 'Showing'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-black">{filteredList.length}</span>{' '}
          {isAr ? 'من إجمالي' : 'of'}{' '}
          <span className="text-slate-800 dark:text-slate-200 font-bold">{metrics.total}</span>{' '}
          {isAr ? 'متابعة مسجلة' : 'follow-up reminders'}
        </p>
      </div>

      {/* Content Area */}
      {loading && filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAr ? 'جاري تحميل جدول المتابعات...' : 'Loading Follow-up Agenda…'}
          </p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center px-4">
          <div className="h-16 w-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-inner">
            <CalendarClock size={30} />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1 text-sm">
            {isAr ? 'لا توجد مواعيد متابعة في هذا التصنيف' : 'No follow-up reminders in this category'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            {isAr
              ? 'تظهر التنبيهات هنا تلقائياً عند تحديد موعد متابعة قادم أثناء تسجيل الجلسات السريرية'
              : 'Reminders appear here automatically when a follow-up date is scheduled during clinical sessions'}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedList.map((fu) => (
                <FollowUpCard
                  key={fu.id}
                  followUp={fu}
                  isClearing={clearingId === fu.id}
                  onBook={() => setBookingFor(fu)}
                  onWalkIn={() => setWalkInFor(fu)}
                  onReschedule={() => setReschedulingFor(fu)}
                  onMarkDone={() => markDone(fu)}
                  onViewPatient={() => fu.patient && onViewPet?.(fu.patient.id)}
                />
              ))}
            </div>
          ) : (
            <FollowUpTableView
              followUps={paginatedList}
              clearingId={clearingId}
              onBook={(fu) => setBookingFor(fu)}
              onWalkIn={(fu) => setWalkInFor(fu)}
              onReschedule={(fu) => setReschedulingFor(fu)}
              onMarkDone={(fu) => markDone(fu)}
              onViewPatient={(fu) => fu.patient && onViewPet?.(fu.patient.id)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">
                {isAr ? 'صفحة' : 'Page'} {page} {isAr ? 'من' : 'of'} {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-bold"
                >
                  {isAr ? 'السابق' : 'Prev'}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-bold"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Book Appointment Modal */}
      {bookingFor && (
        <VetAppointmentFormModal
          preselectedPatient={bookingFor.patient}
          onSave={async () => {
            const scheduled = bookingFor
            setBookingFor(null)
            await markDone(scheduled)
          }}
          onClose={() => setBookingFor(null)}
        />
      )}

      {/* Immediate Session Modal */}
      {walkInFor && (
        <VetSessionFormModal
          preselectedPatient={walkInFor.patient}
          onSave={async () => {
            const target = walkInFor
            setWalkInFor(null)
            await markDone(target)
            refresh()
          }}
          onClose={() => setWalkInFor(null)}
        />
      )}

      {/* Reschedule Date Modal */}
      {reschedulingFor && (
        <RescheduleFollowUpModal
          followUp={reschedulingFor}
          onReschedule={reschedule}
          onClose={() => setReschedulingFor(null)}
        />
      )}
    </div>
  )
}