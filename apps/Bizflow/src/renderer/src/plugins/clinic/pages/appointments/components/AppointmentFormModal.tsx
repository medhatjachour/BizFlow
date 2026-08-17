import React from 'react'
import { X, Calendar, Loader2, Search, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAppointmentForm } from '../hooks/useAppointmentForm'
import { TimeSlotPicker } from './TimeSlotPicker'
import { DURATION_OPTIONS, PAYMENT_METHODS } from '../constants'
import type { Appointment } from '../types'

interface Props {
  existing?: Appointment | null
  defaultDate?: string | null
  defaultPatientId?: string | null
  defaultPatientName?: string | null
  onClose: () => void
  onSaved: (date?: string) => void
}

export const AppointmentFormModal: React.FC<Props> = ({
  existing,
  defaultDate,
  defaultPatientId,
  defaultPatientName,
  onClose,
  onSaved
}) => {
  const { t } = useLanguage()
  const {
    form,
    setForm,
    saving,
    searchQuery,
    searchResults,
    searching,
    loadingSlots,
    doctors,
    singleDoctor,
    selectedDay,
    selectedTime,
    timeSlots,
    getSlotStatus,
    handleSearchChange,
    selectPatient,
    save
  } = useAppointmentForm(existing, defaultDate, defaultPatientId, defaultPatientName, onSaved)

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  const currentConflict = selectedTime ? getSlotStatus(selectedTime) : { state: 'available' as const }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Calendar className="h-5 w-5" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {existing?.id ? t('editAppointment') : t('bookAppointment')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Patient *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder={t('searchPatient')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={Boolean(defaultPatientId)}
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">...</span>}
              {searchResults.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-44 overflow-y-auto">
                  {searchResults.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => selectPatient(p)}
                      className="px-3.5 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                    >
                      <div className="font-semibold text-xs text-slate-800 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.phone}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('dateTimeLabel')} *
              </label>
              <input
                type="date"
                className={inputCls}
                value={selectedDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, appointmentDate: `${e.target.value}T${selectedTime || '09:00'}` }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('durationMinLabel')}
              </label>
              <select
                className={inputCls}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slots */}
          <TimeSlotPicker
            timeSlots={timeSlots}
            selectedTime={selectedTime}
            duration={Number(form.duration) || 30}
            loadingSlots={loadingSlots}
            getSlotStatus={getSlotStatus}
            onSelectSlot={(slot) => setForm((f) => ({ ...f, appointmentDate: `${selectedDay}T${slot}` }))}
          />

          {/* Payment Section */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-slate-50/50 dark:bg-slate-800/40 p-3.5 space-y-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              Payment Details
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Charged</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={form.amountCharged}
                  onChange={(e) => setForm((f) => ({ ...f, amountCharged: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Paid</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  placeholder="0.00"
                  value={form.amountPaid}
                  onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Method</label>
                <select
                  className={inputCls}
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doctor and Status */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('apptTypeLabel')}
              </label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="consultation">{t('apptTypeConsultation')}</option>
                <option value="follow_up">{t('apptTypeFollowUp')}</option>
                <option value="procedure">{t('apptTypeProcedure')}</option>
                <option value="checkup">{t('apptTypeCheckup')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('apptStatusLabel')}
              </label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="scheduled">{t('apptStatusScheduled')}</option>
                <option value="confirmed">{t('apptStatusConfirmed')}</option>
                <option value="completed">{t('apptStatusCompleted')}</option>
                <option value="cancelled">{t('cancelled')}</option>
                <option value="no_show">{t('apptStatusNoShow')}</option>
              </select>
            </div>
          </div>

          {!singleDoctor && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('doctorName')}
              </label>
              <select
                className={inputCls}
                value={form.doctorId}
                onChange={(e) => {
                  const d = doctors.find((x) => x.id === e.target.value)
                  setForm((f) => ({ ...f, doctorId: e.target.value, doctorName: d ? d.name : '' }))
                }}
              >
                <option value="">{t('unassigned') || '— Unassigned —'}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} {d.specialty ? `• ${d.specialty}` : ''} {d.isDefault ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t('notes')}
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder={t('optionalNotes')}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={save}
            disabled={
              saving ||
              !form.patientId ||
              !form.appointmentDate ||
              currentConflict.state === 'booked' ||
              currentConflict.state === 'overlap'
            }
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {existing?.id ? t('editAppointment') : t('bookAppointment')}
          </button>
        </div>
      </div>
    </div>
  )
}