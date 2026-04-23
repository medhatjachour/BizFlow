import { useState, useRef, useEffect } from 'react'
import { X, Calendar, Loader2, Search, AlertTriangle, Clock, DollarSign } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  existing?: any | null
  defaultDate?: string | null
  defaultPatientId?: string | null
  defaultPatientName?: string | null
  onClose: () => void
  onSaved: (date?: string) => void
}

// Timezone-safe: returns local "YYYY-MM-DDTHH:MM"
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

function initDateTime(existing: any, defaultDate?: string | null): string {
  if (existing?.appointmentDate) return toDatetimeLocal(existing.appointmentDate)
  if (defaultDate) return `${defaultDate}T09:00`
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
  return toDatetimeLocal(d.toISOString())
}

const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60]

function buildTimeSlots(durationMins: number): string[] {
  const slots: string[] = []
  for (let total = 7 * 60; total <= 23 * 60 + 30; total += durationMins) {
    const h = Math.floor(total / 60)
    const m = total % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

const toArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[]
  }
  return []
}

export default function AppointmentFormModal({
  existing, defaultDate, defaultPatientId, defaultPatientName, onClose, onSaved
}: Props) {
  const { showToast } = useToast()
  const { t } = useLanguage()

  const TYPES = [
    { value: 'consultation', label: t('apptTypeConsultation') },
    { value: 'follow_up',    label: t('apptTypeFollowUp') },
    { value: 'procedure',    label: t('apptTypeProcedure') },
    { value: 'checkup',      label: t('apptTypeCheckup') },
  ]
  const STATUSES = [
    { value: 'scheduled',  label: t('apptStatusScheduled') },
    { value: 'confirmed',  label: t('apptStatusConfirmed') },
    { value: 'completed',  label: t('apptStatusCompleted') },
    { value: 'cancelled',  label: t('cancelled') },
    { value: 'no_show',    label: t('apptStatusNoShow') },
  ]

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    patientId:       existing?.patientId       ?? defaultPatientId ?? '',
    appointmentDate: initDateTime(existing, defaultDate),
    duration:        String(existing?.duration ?? 30),
    type:            existing?.type            ?? 'consultation',
    doctorName:      existing?.doctorName      ?? '',
    notes:           existing?.notes           ?? '',
    status:          existing?.status          ?? 'scheduled',
    amountCharged:   String(existing?.amountCharged ?? ''),
    amountPaid:      String(existing?.amountPaid    ?? ''),
    paymentMethod:   existing?.paymentMethod        ?? 'cash',
  })
  const [searchQuery,   setSearchQuery]   = useState(existing?.patient?.name ?? defaultPatientName ?? '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching,     setSearching]     = useState(false)
  const [dayAppts,      setDayAppts]      = useState<any[]>([])
  const [loadingSlots,  setLoadingSlots]  = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Extract local date and time from the combined field
  const selectedDay  = form.appointmentDate.slice(0, 10)  // "YYYY-MM-DD"
  const selectedTime = form.appointmentDate.slice(11, 16) // "HH:MM"

  // Reload booked slots whenever the date changes
  useEffect(() => {
    if (!selectedDay || selectedDay.length < 10) return
    let cancelled = false
    setLoadingSlots(true)
    ;(window.api.clinic.appointments.getAll as any)({ date: selectedDay, skip: 0, take: 500 })
      .then((res: any) => {
        if (cancelled) return
        const appts = toArray(res)
        setDayAppts(appts)
        // For new appointments, auto-advance default slot if it's already taken
        if (!existing?.id) {
          const dur = Number(form.duration) || 30
          const slots = buildTimeSlots(dur)
          const todayNow = toDatetimeLocal(new Date().toISOString()).slice(0, 10)
          const nowHH = (() => { const n = new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}` })()
          const currentSelected = form.appointmentDate.slice(11, 16)
          const isConflicted = (slotTime: string) => {
            if (selectedDay === todayNow && slotTime < nowHH) return true
            const slotStart = new Date(`${selectedDay}T${slotTime}:00`).getTime()
            const slotEnd   = slotStart + dur * 60000
            return appts.some(a => {
              if (!['scheduled', 'confirmed'].includes(a.status)) return false
              const s = new Date(a.appointmentDate).getTime()
              const e = s + (a.duration || 30) * 60000
              return slotStart < e && slotEnd > s
            })
          }
          if (isConflicted(currentSelected)) {
            const first = slots.find(s => !isConflicted(s))
            if (first) setForm(f => ({ ...f, appointmentDate: selectedDay + 'T' + first }))
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [selectedDay])

  const runSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try { setSearchResults((await window.api.clinic.patients.searchLite(q)) ?? []) }
    finally { setSearching(false) }
  }

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => runSearch(v), 250)
  }

  const selectPatient = (p: any) => {
    setForm(f => ({ ...f, patientId: p.id }))
    setSearchQuery(p.name)
    setSearchResults([])
  }

  // Returns whether a slot time conflicts with existing appointments
  const todayStr = toDatetimeLocal(new Date().toISOString()).slice(0, 10)
  const nowHHMM  = (() => { const n = new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}` })()

  type SlotState = 'available' | 'booked' | 'overlap' | 'past'
  const slotStatus = (slotTime: string): { state: SlotState; patient?: string } => {
    // Disable past slots when the selected day is today
    if (selectedDay === todayStr && slotTime < nowHHMM) return { state: 'past' }

    const duration = Number(form.duration) || 30
    // Parse slot as local time
    const slotStart = new Date(`${selectedDay}T${slotTime}:00`).getTime()
    const slotEnd   = slotStart + duration * 60000

    for (const appt of dayAppts) {
      if (appt.id === existing?.id) continue
      if (!['scheduled', 'confirmed'].includes(appt.status)) continue
      const apptStart = new Date(appt.appointmentDate).getTime()
      const apptEnd   = apptStart + (appt.duration || 30) * 60000
      if (slotStart < apptEnd && slotEnd > apptStart) {
        // Fully within an existing slot → hard conflict
        const isFullOverlap = slotStart >= apptStart && slotEnd <= apptEnd
        return { state: isFullOverlap ? 'booked' : 'overlap', patient: appt.patient?.name }
      }
    }
    return { state: 'available' }
  }

  const currentConflict = selectedTime ? slotStatus(selectedTime) : { state: 'available' as SlotState }
  const timeSlots = buildTimeSlots(Number(form.duration) || 30)
  const gridCols = Number(form.duration) <= 15 ? 'grid-cols-10' : Number(form.duration) <= 20 ? 'grid-cols-8' : Number(form.duration) >= 60 ? 'grid-cols-6' : 'grid-cols-7'

  const handleSave = async () => {
    if (!form.patientId)       { showToast('error', t('pleaseSelectPatient')); return }
    if (!form.appointmentDate) { showToast('error', t('pleaseSetDateTime'));    return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        duration:       Number(form.duration) || 30,
        doctorName:     form.doctorName.trim() || null,
        notes:          form.notes.trim()      || null,
        amountCharged:  form.amountCharged !== '' ? parseFloat(form.amountCharged) : null,
        amountPaid:     form.amountPaid    !== '' ? parseFloat(form.amountPaid)    : null,
        paymentMethod:  form.paymentMethod || null,
      }
      if (existing?.id) {
        await window.api.clinic.appointments.update(existing.id, payload)
        showToast('success', t('appointmentUpdated'))
      } else {
        await window.api.clinic.appointments.create(payload)
        showToast('success', t('appointmentBooked'))
      }
      onSaved(form.appointmentDate.slice(0, 10))
    } catch (err) { console.error('[AppointmentFormModal] save failed:', err); showToast('error', t('failedSaveAppointment')) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {existing?.id ? t('editAppointment') : t('bookAppointment')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* Patient search */}
          {field('Patient *',
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder={t('searchPatient')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={!!defaultPatientId}
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>}
              {searchResults.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-44 overflow-y-auto">
                  {searchResults.map((p) => (
                    <li key={p.id} onMouseDown={() => selectPatient(p)}
                      className="px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer">
                      <div className="font-medium text-sm text-slate-800 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.phone}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('dateTimeLabel') + ' *',
              <input type="date" className={inputCls}
                value={selectedDay}
                onChange={(e) => {
                  const newDay = e.target.value
                  setForm(f => ({ ...f, appointmentDate: newDay + 'T' + (selectedTime || '09:00') }))
                }} />
            )}
            {field(t('durationMinLabel'),
              <select className={inputCls} value={form.duration}
                onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}>
                {DURATION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Visual Time Slot Picker ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('selectTime')} *
              </label>
              {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            </div>

            <div className={`grid ${gridCols} gap-1`}>
              {timeSlots.map((slot) => {
                const { state, patient } = slotStatus(slot)
                const isSelected = slot === selectedTime
                return (
                  <button
                    key={slot}
                    type="button"
                    title={state !== 'available' ? `${patient ?? t('slotBooked')}` : t('slotAvailable')}
                    disabled={state === 'booked' || state === 'overlap' || state === 'past'}
                    onClick={() => setForm(f => ({ ...f, appointmentDate: selectedDay + 'T' + slot }))}
                    className={`
                      text-[11px] py-1.5 rounded-lg font-medium transition-all text-center leading-none
                      ${isSelected
                        ? 'bg-teal-600 text-white shadow ring-2 ring-teal-400 dark:ring-teal-500 scale-105'
                        : state === 'past'
                          ? 'bg-slate-100 text-slate-300 dark:bg-slate-800/50 dark:text-slate-600 cursor-not-allowed opacity-40'
                          : state === 'booked'
                          ? 'bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-500 cursor-not-allowed line-through opacity-70'
                          : state === 'overlap'
                            ? 'bg-amber-100 text-amber-400 dark:bg-amber-900/30 dark:text-amber-500 cursor-not-allowed line-through opacity-70'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400'
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
                { color: 'bg-slate-200 dark:bg-slate-700',      label: t('slotAvailable') },
                { color: 'bg-teal-600',                          label: selectedTime || '—' },
                { color: 'bg-red-200 dark:bg-red-900/40',        label: t('slotBooked') },
                { color: 'bg-amber-200 dark:bg-amber-900/40',    label: t('slotOverlap') },
                { color: 'bg-slate-100 dark:bg-slate-800/50 opacity-40', label: 'Past' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className={`h-2 w-2 rounded-sm inline-block ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
            {/* ── Payment Section ────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                Payment
                
              </span>
            </button>
            { (
              <div className="p-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Charged</label>
                  <input
                    type="number" min="0" step="0.01"
                    className={inputCls}
                    placeholder="0.00"
                    value={form.amountCharged}
                    onChange={e => setForm(f => ({ ...f, amountCharged: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Paid</label>
                  <input
                    type="number" min="0" step="0.01"
                    className={inputCls}
                    placeholder="0.00"
                    value={form.amountPaid}
                    onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Method</label>
                  <select className={inputCls} value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="transfer">Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {parseFloat(form.amountCharged || '0') > parseFloat(form.amountPaid || '0') && form.amountPaid !== '' && (
                  <div className="col-span-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Balance due: {(parseFloat(form.amountCharged || '0') - parseFloat(form.amountPaid || '0')).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conflict warning banner */}
          {currentConflict.state !== 'available' && selectedTime && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('timeSlotConflict')}
                {currentConflict.patient && (
                  <span className="font-semibold"> — {currentConflict.patient}</span>
                )}
              </p>
            </div>
          )}

          {/* Type / Status */}
          <div className="grid grid-cols-2 gap-4">
            {field(t('apptTypeLabel'),
              <select className={inputCls} value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
              </select>
            )}
            {field(t('apptStatusLabel'),
              <select className={inputCls} value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </div>

          {field(t('doctorName'),
            <input type="text" className={inputCls} placeholder={t('optionalField')}
              value={form.doctorName}
              onChange={(e) => setForm(f => ({ ...f, doctorName: e.target.value }))} />
          )}

          {field(t('notes'),
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder={t('optionalNotes')}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={handleSave}
            disabled={saving || !form.patientId || !form.appointmentDate || currentConflict.state === 'booked' || currentConflict.state === 'overlap'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            {existing?.id ? t('editAppointment') : t('bookAppointment')}
          </button>
        </div>
      </div>
    </div>
  )
}
