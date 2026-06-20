import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react'
import type { VetPatient } from '../index'
import type { VetStaff } from './VetStaffFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  appointment?: any
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const APPT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up',    label: 'Follow-up' },
  { value: 'vaccination',  label: 'Vaccination' },
  { value: 'surgery',      label: 'Surgery' },
  { value: 'grooming',     label: 'Grooming' },
  { value: 'checkup',      label: 'Checkup' },
]

const STATUS_OPTIONS = [
  { value: 'scheduled',  label: 'Scheduled' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'no_show',    label: 'No Show' },
]

const DURATION_PRESETS = [5, 15, 30, 45, 60]

function getSlotStep(duration: number): number {
  if (duration <= 15) return 15
  if (duration <= 30) return 30
  return 60
}

function buildSlots(step: number): string[] {
  const slots: string[] = []
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += step) {
      if (h === 22 && m > 0) break
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${day}T${h}:${mi}`
  } catch { return '' }
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function VetAppointmentFormModal({ appointment, preselectedPatient, onSave, onClose }: Props) {
  const isEdit = !!appointment
  const { t } = useLanguage()

  const [patient,    setPatient]    = useState<any | null>(preselectedPatient ?? null)
  const [ptSearch,   setPtSearch]   = useState('')
  const [ptResults,  setPtResults]  = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initDate = (() => {
    if (appointment?.appointmentDate) return toDatetimeLocal(appointment.appointmentDate)
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
    return toDatetimeLocal(d.toISOString())
  })()

  const [form, setForm] = useState({
    appointmentDate: initDate,
    duration:        String(appointment?.duration ?? 30),
    type:            appointment?.type ?? 'consultation',
    vetName:         appointment?.vetName ?? '',
    notes:           appointment?.notes ?? '',
    status:          appointment?.status ?? 'scheduled',
  })

  const selectedDay  = form.appointmentDate.slice(0, 10)
  const selectedTime = form.appointmentDate.slice(11, 16)

  const [dayAppts,     setDayAppts]    = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState('')
  const [attendingVets, setAttendingVets] = useState<VetStaff[]>([])
  const [vetsLoading,   setVetsLoading]   = useState(false)

  // Load vets on mount
  useEffect(() => {
    const loadVets = async () => {
      setVetsLoading(true)
      try {
        const raw: any = await window.api.vet?.staff.getAll({ status: 'active', take: 200 })
        const list: VetStaff[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setAttendingVets(
          list
            .filter((staff) => staff.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      } finally {
        setVetsLoading(false)
      }
    }
    void loadVets()
  }, [])

  // Load existing appointments for the selected day
  useEffect(() => {
    if (!selectedDay || selectedDay.length < 10) return
    let cancelled = false
    setLoadingSlots(true)
    const from = new Date(selectedDay + 'T00:00:00').toISOString()
    const to   = new Date(selectedDay + 'T23:59:59').toISOString()
    window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 200 })
      .then((res: any) => {
        if (cancelled) return
        const rows = Array.isArray(res) ? res : (res?.data ?? [])
        setDayAppts(rows)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [selectedDay])

  useEffect(() => {
    if (appointment) {
      setForm({
        appointmentDate: toDatetimeLocal(appointment.appointmentDate) ?? initDate,
        duration:        String(appointment.duration ?? 30),
        type:            appointment.type ?? 'consultation',
        vetName:         appointment.vetName ?? '',
        notes:           appointment.notes ?? '',
        status:          appointment.status ?? 'scheduled',
      })
      if (appointment.patient) setPatient(appointment.patient)
    }
  }, [appointment])

  const duration = parseInt(form.duration) || 30
  const slotStep = getSlotStep(duration)
  const timeSlots = buildSlots(slotStep)
  const gridCols = slotStep <= 15 ? 8 : slotStep <= 30 ? 7 : 6

  const todayStr = toIsoDate(new Date())
  const nowHHMM  = (() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
  })()

  type SlotState = 'available' | 'booked' | 'overlap' | 'past'
  const slotStatus = (slotTime: string): { state: SlotState; patient?: string } => {
    if (selectedDay === todayStr && slotTime < nowHHMM) return { state: 'past' }
    const slotStart = new Date(`${selectedDay}T${slotTime}:00`).getTime()
    const slotEnd   = slotStart + duration * 60000
    for (const appt of dayAppts) {
      if (appt.id === appointment?.id) continue
      if (!['scheduled', 'confirmed'].includes(appt.status)) continue
      const apptStart = new Date(appt.appointmentDate).getTime()
      const apptEnd   = apptStart + (appt.duration || 30) * 60000
      if (slotStart < apptEnd && slotEnd > apptStart) {
        const isFullOverlap = slotStart >= apptStart && slotEnd <= apptEnd
        return { state: isFullOverlap ? 'booked' : 'overlap', patient: appt.patient?.name }
      }
    }
    return { state: 'available' }
  }

  const currentConflict = selectedTime ? slotStatus(selectedTime) : { state: 'available' as SlotState }

  const searchPatients = (q: string) => {
    setPtSearch(q)
    if (ptSearchTimer.current) clearTimeout(ptSearchTimer.current)
    if (!q.trim()) { setPtResults([]); return }
    ptSearchTimer.current = setTimeout(async () => {
      setPtSearching(true)
      try { setPtResults(await window.api.vet?.patients.searchLite(q) ?? []) }
      finally { setPtSearching(false) }
    }, 250)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) { setError('Please select a patient'); return }
    if (!form.appointmentDate) { setError('Please set date and time'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        patientId:       patient.id,
        appointmentDate: new Date(form.appointmentDate).toISOString(),
        duration:        parseInt(form.duration) || 30,
        type:            form.type,
        vetName:         form.vetName.trim() || undefined,
        notes:           form.notes.trim() || undefined,
        status:          form.status,
      }
      if (isEdit) {
        await window.api.vet?.appointments.update(appointment.id, payload)
      } else {
        await window.api.vet?.appointments.create(payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isEdit ? (t('vetEditAppointment')||'Edit Appointment') : (t('bookAppointment')||'Book Appointment')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[76vh] overflow-y-auto">

            {/* Patient search */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('vetPatientLabel')||'Patient'} *</label>
              {patient ? (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{patient.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{patient.species}</p>
                  </div>
                  {!preselectedPatient && (
                    <button type="button" onClick={() => { setPatient(null); setPtSearch('') }} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={ptSearch}
                    onChange={e => searchPatients(e.target.value)}
                    placeholder={t('vetSearchPatient')||'Search pet name...'}
                    className={`${inputCls} pl-9`}
                  />
                  {ptSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                  {ptResults.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                      {ptResults.map(p => (
                        <li key={p.id} onMouseDown={() => { setPatient(p); setPtResults([]) }}
                          className="px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer">
                          <div className="font-medium text-sm text-slate-800 dark:text-white">{p.name}</div>
                          <div className="text-xs text-slate-400 capitalize">{p.species}{p.owner?.name ? ` · ${p.owner.name}` : ''}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('appointmentDate')||'Date'} *</label>
              <input
                type="date"
                className={inputCls}
                value={selectedDay}
                onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value + 'T' + (selectedTime || '09:00') }))}
              />
            </div>

            {/* Duration presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('vetDurationMin')||'Duration'}</label>
              <div className="flex gap-2">
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, duration: String(d) }))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                      parseInt(form.duration) === d
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-400'
                    }`}
                  >
                    {d === 60 ? '1h' : `${d}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual time slot picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Select Time *
                </label>
                {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
              </div>

              <div className={`grid gap-1 max-h-48 overflow-y-auto p-0.5`} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                {timeSlots.map(slot => {
                  const { state, patient: blockedBy } = slotStatus(slot)
                  const isSelected = slot === selectedTime
                  return (
                    <button
                      key={slot}
                      type="button"
                      title={state !== 'available' ? (blockedBy ?? 'Booked') : 'Available'}
                      disabled={state === 'booked' || state === 'overlap' || state === 'past'}
                      onClick={() => setForm(f => ({ ...f, appointmentDate: selectedDay + 'T' + slot }))}
                      className={`
                        text-[11px] py-1.5 rounded-lg font-medium transition-all text-center leading-none
                        ${isSelected
                          ? 'bg-violet-600 text-white shadow ring-2 ring-violet-400 dark:ring-violet-500 scale-105'
                          : state === 'past'
                            ? 'bg-slate-100 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600 cursor-not-allowed opacity-40'
                            : state === 'booked'
                              ? 'bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-500 cursor-not-allowed line-through opacity-70'
                              : state === 'overlap'
                                ? 'bg-amber-100 text-amber-400 dark:bg-amber-900/30 dark:text-amber-500 cursor-not-allowed line-through opacity-70'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400'
                        }
                      `}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {[
                  { color: 'bg-slate-200 dark:bg-slate-700',              label: t('vetAvailableSlot')||'Available' },
                  { color: 'bg-violet-600',                               label: selectedTime || 'None' },
                  { color: 'bg-red-200 dark:bg-red-900/40',               label: t('vetBookedSlot')||'Booked' },
                  { color: 'bg-amber-200 dark:bg-amber-900/40',           label: t('vetConflictSlot')||'Overlap' },
                  { color: 'bg-slate-100 dark:bg-slate-800/50 opacity-40', label: t('vetPastSlot')||'Past' },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className={`h-2 w-2 rounded-sm inline-block ${color}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Conflict warning */}
            {currentConflict.state !== 'available' && selectedTime && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This time slot conflicts with an existing appointment
                  {currentConflict.patient && <span className="font-semibold"> — {currentConflict.patient}</span>}
                </p>
              </div>
            )}

            {/* Type / Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('appointmentType')||'Type'}</label>
                <select className={inputCls} value={form.type} onChange={setF('type')}>
                  {APPT_TYPES.map(at => <option key={at.value} value={at.value}>{t(at.value as any)||at.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('appointmentStatus')||'Status'}</label>
                <select className={inputCls} value={form.status} onChange={setF('status')}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{t(`status${s.label.replace(' ','').replace(/\b\w/g, l => l.toUpperCase())}` as any)||s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('vetName')||'Attending Vet'}</label>
              {vetsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading vets…</div>
              ) : attendingVets.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 px-1">No active vets found. Add one in the Vets tab first.</p>
              ) : (
                <select className={inputCls} value={form.vetName} onChange={setF('vetName')}>
                  <option value="">— Optional —</option>
                  {form.vetName && !attendingVets.find(v => v.name === form.vetName) && (
                    <option value={form.vetName}>{form.vetName} (archived)</option>
                  )}
                  {attendingVets.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{t('vetNotes')||'Notes'}</label>
              <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Optional notes..."
                value={form.notes} onChange={setF('notes')} />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="flex items-center gap-3 px-6 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t('cancel')||'Cancel'}
            </button>
            <button type="submit" disabled={saving || !patient || !form.appointmentDate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              {isEdit ? (t('vetSaveChanges')||'Save Changes') : (t('bookAppointment')||'Book Appointment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}