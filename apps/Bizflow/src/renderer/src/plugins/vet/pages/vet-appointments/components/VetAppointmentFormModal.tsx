import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, Calendar, Clock, AlertTriangle} from 'lucide-react'
import { VetPatient } from '../../vet-owners/types'
import { VetStaff } from '../../vet-staff/types'
import { APPT_TYPES, STATUS_CONFIG, DURATION_PRESETS } from '../constants'
import { toIsoDateString, buildSlotSchedule } from '../utils'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  appointment?: any
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function VetAppointmentFormModal({ appointment, preselectedPatient, onSave, onClose }: Props) {
  const isEdit = Boolean(appointment)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [patient, setPatient] = useState<any | null>(preselectedPatient ?? null)
  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialDateStr = appointment?.appointmentDate
    ? appointment.appointmentDate.slice(0, 10)
    : toIsoDateString(new Date())

  const initialTimeStr = appointment?.appointmentDate
    ? appointment.appointmentDate.slice(11, 16)
    : '09:00'

  const [selectedDay, setSelectedDay] = useState(initialDateStr)
  const [selectedTime, setSelectedTime] = useState(initialTimeStr)
  const [duration, setDuration] = useState(appointment?.duration ? String(appointment.duration) : '30')
  const [type, setType] = useState(appointment?.type || 'consultation')
  const [vetName, setVetName] = useState(appointment?.vetName || '')
  const [notes, setNotes] = useState(appointment?.notes || '')
  const [status, setStatus] = useState(appointment?.status || 'scheduled')

  const [dayAppts, setDayAppts] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [attendingVets, setAttendingVets] = useState<VetStaff[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadVets = async () => {
      try {
        const raw: any = await window.api.vet?.staff.getAll({ status: 'active', take: 200 })
        const list: VetStaff[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setAttendingVets(list.filter((s) => s.status === 'active'))
      } catch {}
    }
    loadVets()
  }, [])

  useEffect(() => {
    if (!selectedDay) return
    let cancelled = false
    setLoadingSlots(true)
    const from = new Date(selectedDay + 'T00:00:00.000').toISOString()
    const to = new Date(selectedDay + 'T23:59:59.999').toISOString()

    window.api.vet?.appointments
      .getAll({ from, to, skip: 0, take: 200 })
      .then((res: any) => {
        if (cancelled) return
        setDayAppts(res?.data ?? (Array.isArray(res) ? res : []))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDay])

  useEffect(() => {
    if (appointment?.patient) setPatient(appointment.patient)
  }, [appointment])

  const searchPatients = (q: string) => {
    setPtSearch(q)
    if (ptSearchTimer.current) clearTimeout(ptSearchTimer.current)
    if (!q.trim()) { setPtResults([]); return }
    ptSearchTimer.current = setTimeout(async () => {
      setPtSearching(true)
      try {
        const res = await window.api.vet?.patients.searchLite(q)
        setPtResults(res ?? [])
      } finally {
        setPtSearching(false)
      }
    }, 250)
  }

  const durationNum = parseInt(duration, 10) || 30
  const timeSlots = buildSlotSchedule(durationNum <= 15 ? 15 : 30)

  // Slot conflict verification
  const checkSlotConflict = (slotTime: string) => {
    const slotStart = new Date(`${selectedDay}T${slotTime}:00`).getTime()
    const slotEnd = slotStart + durationNum * 60000

    for (const appt of dayAppts) {
      if (appt.id === appointment?.id) continue
      if (!['scheduled', 'confirmed'].includes(appt.status)) continue
      const apptStart = new Date(appt.appointmentDate).getTime()
      const apptEnd = apptStart + (appt.duration || 30) * 60000
      if (slotStart < apptEnd && slotEnd > apptStart) {
        return { hasConflict: true, patientName: appt.patient?.name }
      }
    }
    return { hasConflict: false }
  }

  const currentConflict = checkSlotConflict(selectedTime)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) {
      setError(isAr ? 'يرجى اختيار مريض / حيوان أليف' : 'Please select a patient')
      return
    }
    if (!selectedDay || !selectedTime) {
      setError(isAr ? 'يرجى تحديد التاريخ والوقت' : 'Please select date and time slot')
      return
    }

    setSaving(true)
    setError('')
    try {
      const isoAppointmentDate = new Date(`${selectedDay}T${selectedTime}:00`).toISOString()

      const payload = {
        patientId: patient.id,
        appointmentDate: isoAppointmentDate,
        duration: durationNum,
        type,
        vetName: vetName.trim() || undefined,
        notes: notes.trim() || undefined,
        status
      }

      if (isEdit && appointment) {
        await window.api.vet?.appointments.update(appointment.id, payload)
      } else {
        await window.api.vet?.appointments.create(payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.message ?? (isAr ? 'فشل حفظ الموعد' : 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isEdit ? (isAr ? 'تعديل بيانات الحجز' : 'Edit Appointment') : (isAr ? 'حجز موعد عيادة جديد' : 'Book New Appointment')}
              </h2>
              <p className="text-xs text-slate-400">{isAr ? 'جدولة ومصفوفة الأوقات المتاحة' : 'Schedule time slot & doctor'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {/* Patient Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'المريض' : 'Patient'} *
              </label>
              {patient ? (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{patient.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{patient.species} {patient.owner?.name ? `• ${patient.owner.name}` : ''}</p>
                  </div>
                  {!preselectedPatient && (
                    <button type="button" onClick={() => setPatient(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={15} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={ptSearch}
                    onChange={(e) => searchPatients(e.target.value)}
                    placeholder={isAr ? 'ابحث باسم الحيوان الأليف...' : 'Search pet name...'}
                    className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`}
                  />
                  {ptSearching && <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                  {ptResults.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-44 overflow-y-auto text-xs">
                      {ptResults.map((p) => (
                        <li
                          key={p.id}
                          onMouseDown={() => {
                            setPatient(p)
                            setPtResults([])
                          }}
                          className="px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400 capitalize">{p.species} {p.owner?.name ? `• ${p.owner.name}` : ''}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Date & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'تاريخ الحجز' : 'Date'} *
                </label>
                <DateField value={selectedDay} onChange={(v) => setSelectedDay(v)} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'المدة المتوقعة' : 'Duration'}
                </label>
                <div className="flex gap-1.5">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(String(d))}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                        durationNum === d
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Slot Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock size={13} className="text-violet-500" />
                  {isAr ? 'اختر التوقيت المتاح' : 'Available Time Slot'} *
                </label>
                {loadingSlots && <Loader2 size={12} className="animate-spin text-slate-400" />}
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-40 overflow-y-auto p-1 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                {timeSlots.map((slot) => {
                  const { hasConflict } = checkSlotConflict(slot)
                  const isSelected = slot === selectedTime

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={hasConflict}
                      onClick={() => setSelectedTime(slot)}
                      className={`text-[11px] py-1.5 rounded-xl font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-400 scale-105'
                          : hasConflict
                          ? 'bg-rose-100 text-rose-400 dark:bg-rose-950/40 dark:text-rose-600 cursor-not-allowed line-through opacity-60'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400 border border-slate-200/60 dark:border-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Conflict Notification */}
            {currentConflict.hasConflict && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle size={15} className="shrink-0" />
                <span>
                  {isAr
                    ? `تنبيه: هذا التوقيت يتعارض مع موعد مسجل (${currentConflict.patientName || 'مريض آخر'})`
                    : `Warning: This slot conflicts with ${currentConflict.patientName || 'another booking'}`}
                </span>
              </div>
            )}

            {/* Type & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نوع الموعد' : 'Type'}
                </label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                  {APPT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {isAr ? t.labelAr : t.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'حالة الحجز' : 'Status'}
                </label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputCls}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {isAr ? cfg.labelAr : cfg.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attending Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'الطبيب البيطري المعالج' : 'Attending Veterinarian'}
              </label>
              <select value={vetName} onChange={(e) => setVetName(e.target.value)} className={inputCls}>
                <option value="">{isAr ? '— اختياري / غير محدد —' : '— Optional —'}</option>
                {attendingVets.map((v) => (
                  <option key={v.id} value={v.name}>
                    Dr. {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={isAr ? 'أي تعليمات أو تفاصيل إضافية...' : 'Optional notes or instructions...'}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-95"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'تأكيد الحجز' : 'Confirm Booking')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}