import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CheckCircle2,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Clock,
  Users,
  Phone
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useFollowUps } from '../hooks/useFollowUps'
import { daysDiff } from '../utils'
import { AppointmentFormModal } from './AppointmentFormModal'
import type { FollowUp, FollowUpFilter } from '../types'

export const FollowUpsTab: React.FC = () => {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const {
    filter,
    setFilter,
    counts,
    loading,
    clearingId,
    pageItems,
    totalPages,
    safePage,
    totalItems,
    setPage,
    markDone,
    reload
  } = useFollowUps()

  const [bookingFor, setBookingFor] = useState<FollowUp | null>(null)

  const FILTER_TABS: { key: FollowUpFilter; label: string; color: string }[] = [
    { key: 'all', label: `${t('followUpAll')} (${counts.all})`, color: 'text-slate-600 dark:text-slate-300' },
    { key: 'today', label: `${t('followUpDueTodayTab')} (${counts.today})`, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'overdue', label: `${t('followUpOverdueTab')} (${counts.overdue})`, color: 'text-rose-600 dark:text-rose-400' },
    { key: 'upcoming', label: `${t('followUpUpcomingTab')} (${counts.upcoming})`, color: 'text-teal-600 dark:text-teal-400' }
  ]

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white">{t('followUpRemindersTitle')}</h2>
          <span className="text-xs text-slate-400 font-medium">{t('followUpRemindersSubtitle')}</span>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('followUpRefreshBtn')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/30 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-xs">
          <AlertTriangle className="h-7 w-7 text-rose-500 flex-shrink-0" />
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 leading-tight">{counts.overdue}</p>
            <p className="text-xs text-rose-500 font-semibold">{t('followUpOverdueCard')}</p>
          </div>
        </div>
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-xs">
          <Clock className="h-7 w-7 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 leading-tight">{counts.today}</p>
            <p className="text-xs text-amber-500 font-semibold">{t('followUpDueTodayCard')}</p>
          </div>
        </div>
        <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/30 rounded-2xl p-3.5 flex items-center gap-3.5 shadow-xs">
          <Users className="h-7 w-7 text-teal-500 flex-shrink-0" />
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400 leading-tight">{counts.upcoming}</p>
            <p className="text-xs text-teal-500 font-semibold">{t('followUpUpcomingCard')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
              filter === tab.key
                ? `border-teal-600 ${tab.color}`
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Follow-up List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-xs font-semibold">Loading...</span>
          </div>
        ) : filteredEmpty(pageItems) ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <CalendarClock size={32} className="opacity-30" />
            <p className="text-xs font-medium">{t('noFollowUpsCategory')}</p>
          </div>
        ) : (
          <div className="space-y-2.5 pb-4">
            {pageItems.map((fu) => {
              const diff = daysDiff(fu.followUpDate)
              const isClearing = clearingId === fu.id

              return (
                <div
                  key={fu.id}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-xs transition-all hover:border-teal-300"
                >
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl py-1.5 border border-slate-100 dark:border-slate-700">
                    <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                      {new Date(fu.followUpDate).toLocaleDateString('en', { day: 'numeric' })}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      {new Date(fu.followUpDate).toLocaleDateString('en', { month: 'short' })}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/clinic/patients/${fu.patientId}`)}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-teal-600"
                      >
                        {fu.patient.name}
                      </button>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          diff < 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : diff === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                        }`}
                      >
                        {diff < 0 ? `${Math.abs(diff)}d Overdue` : diff === 0 ? 'Due Today' : `In ${diff}d`}
                      </span>
                    </div>
                    {(fu.diagnosis || fu.chiefComplaint) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {fu.diagnosis || fu.chiefComplaint}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      {fu.patient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} /> {fu.patient.phone}
                        </span>
                      )}
                      {fu.doctorName && <span>Dr. {fu.doctorName}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setBookingFor(fu)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors"
                    >
                      <Calendar size={12} /> {t('followUpBookApptBtn')}
                    </button>
                    <button
                      onClick={() => markDone(fu)}
                      disabled={isClearing}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl transition-colors"
                    >
                      {isClearing ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      {t('followUpDoneBtn')}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400">
                  Page {safePage} of {totalPages} ({totalItems} records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto Booking Modal */}
      {bookingFor && (
        <AppointmentFormModal
          defaultPatientId={bookingFor.patientId}
          defaultPatientName={bookingFor.patient.name}
          onClose={() => setBookingFor(null)}
          onSaved={async () => {
            const scheduled = bookingFor
            setBookingFor(null)
            showToast('success', t('apptBookedFollowUp'))
            try {
              await window.api.clinic.appointments.clearFollowUp(scheduled.id)
              reload()
            } catch {}
          }}
        />
      )}
    </div>
  )
}

function filteredEmpty(arr: any[]) {
  return !arr || arr.length === 0
}