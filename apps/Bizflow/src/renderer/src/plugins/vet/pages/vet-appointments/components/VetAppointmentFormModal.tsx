import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  PawPrint,
  UserCheck
} from 'lucide-react'
import { VetPatient } from '../../vet-owners/types'
import { VetStaff } from '../../vet-staff/types'
import { APPT_TYPES, STATUS_CONFIG, DURATION_PRESETS } from '../constants'
import { buildSlotSchedule } from '../utils'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { speciesEmoji } from '../../vet-owners/species'

interface Props {
  appointment?: any
  preselectedPatient?: VetPatient | any
  onSave: () => void
  onClose: () => void
}

const GENERAL_PET_NAME = 'General Visit'

const inputCls =
  'w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

// Safe date helpers
const safeDateOnly = (d?: any): string => {
  if (!d) return new Date().toISOString().slice(0, 10)
  try {
    const parsed = new Date(d)
    if (isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10)
    return parsed.toISOString().slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

const safeTimeOnly = (d?: any): string => {
  if (!d) return '09:00'
  try {
    const parsed = new Date(d)
    if (isNaN(parsed.getTime())) return '09:00'
    const hours = String(parsed.getHours()).padStart(2, '0')
    const mins = String(parsed.getMinutes()).padStart(2, '0')
    return `${hours}:${mins}`
  } catch {
    return '09:00'
  }
}

export function VetAppointmentFormModal({
  appointment,
  preselectedPatient,
  onSave,
  onClose
}: Props) {
  const isEdit = Boolean(appointment)
  const { language } = useLanguage()
  const isAr = language === 'ar'

  // Patient / Owner State
  const [patient, setPatient] = useState<any | null>(preselectedPatient ?? null)
  const [selectMode, setSelectMode] = useState<'pet' | 'owner'>('pet')

  // Pet Search
  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState<any[]>([])
  const [ptSearching, setPtSearching] = useState(false)
  const ptSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Owner Search
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerResults, setOwnerResults] = useState<any[]>([])
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null)
  const [ownerPets, setOwnerPets] = useState<any[]>([])
  const [ownerPetsLoading, setOwnerPetsLoading] = useState(false)
  const ownerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Booking Form State
  const [selectedDay, setSelectedDay] = useState(() => safeDateOnly(appointment?.appointmentDate))
  const [selectedTime, setSelectedTime] = useState(() => safeTimeOnly(appointment?.appointmentDate))
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

  // Load active vets list
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

  // Load Day's Appointments for slot conflict checking
  useEffect(() => {
    if (!selectedDay) return
    let cancelled = false
    setLoadingSlots(true)
    const from = new Date(selectedDay + 'T00:00:00.000').toISOString()
    const to = new Date(selectedDay + 'T23:59:59.999').toISOString()

    window.api.vet?.appointments
      ?.getAll({ from, to, skip: 0, take: 200 })
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
    if (appointment?.patient) {
      setPatient(appointment.patient)
    }
  }, [appointment])

  // Search Patients API (handles both getAll and searchLite)
  const searchPatients = (q: string) => {
    setPtSearch(q)
    if (ptSearchTimer.current) clearTimeout(ptSearchTimer.current)
    if (!q.trim()) {
      setPtResults([])
      return
    }

    ptSearchTimer.current = setTimeout(async () => {
      setPtSearching(true)
      try {
        const res =
          (await window.api.vet?.patients?.getAll?.({ search: q, take: 15 })) ??
          (await window.api.vet?.patients?.searchLite?.(q))
        setPtResults(res?.data ?? (Array.isArray(res) ? res : []))
      } catch {
        setPtResults([])
      } finally {
        setPtSearching(false)
      }
    }, 250)
  }

  // Search Owners API
  const searchOwners = (q: string) => {
    setOwnerSearch(q)
    if (ownerSearchTimer.current) clearTimeout(ownerSearchTimer.current)
    if (!q.trim()) {
      setOwnerResults([])
      return
    }

    ownerSearchTimer.current = setTimeout(async () => {
      setOwnerSearching(true)
      try {
        const res =
          (await window.api.vet?.owners?.searchLite?.(q)) ??
          (await window.api.vet?.owners?.getAll?.({ search: q, take: 15 }))
        setOwnerResults(Array.isArray(res) ? res : (res?.data ?? []))
      } catch {
        setOwnerResults([])
      } finally {
        setOwnerSearching(false)
      }
    }, 250)
  }

  const selectOwner = async (o: any) => {
    setSelectedOwner(o)
    setOwnerResults([])
    setOwnerSearch('')
    setOwnerPetsLoading(true)
    try {
      const res = await window.api.vet?.patients?.getAll?.({ search: o.phone || o.name, take: 50 })
      const list = (res?.data ?? (Array.isArray(res) ? res : [])).filter(
        (p: any) => p.owner?.id === o.id || p.ownerId === o.id
      )
      setOwnerPets(list)
    } catch {
      setOwnerPets([])
    } finally {
      setOwnerPetsLoading(false)
    }
  }

  // Book directly under owner (General Visit)
  const useGeneralBooking = async () => {
    if (!selectedOwner) return
    const existing = ownerPets.find((p: any) => p.name === GENERAL_PET_NAME)
    if (existing) {
      setPatient({ ...existing, owner: existing.owner ?? selectedOwner })
      return
    }

    setOwnerPetsLoading(true)
    try {
      const created = await window.api.vet?.patients?.create?.({
        name: GENERAL_PET_NAME,
        species: 'other',
        ownerId: selectedOwner.id
      })
      setPatient({ ...created, owner: selectedOwner })
    } catch (e: any) {
      setError(e.message ?? 'Failed to initialize booking for owner')
    } finally {
      setOwnerPetsLoading(false)
    }
  }

  const durationNum = parseInt(duration, 10) || 30
  const timeSlots = buildSlotSchedule(durationNum <= 15 ? 15 : 30)

  // Slot conflict checker
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
      setError(isAr ? 'يرجى اختيار مريض أو تحديد المالك' : 'Please select a patient or owner')
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
        await window.api.vet?.appointments?.update(appointment.id, payload)
      } else {
        await window.api.vet?.appointments?.create(payload)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-150"
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
                {isEdit
                  ? isAr
                    ? 'تعديل بيانات الحجز'
                    : 'Edit Appointment'
                  : isAr
                  ? 'حجز موعد عيادة جديد'
                  : 'Book New Appointment'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'جدولة الموعد واختيار الوقت' : 'Schedule time slot & optional doctor'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
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

            {/* ── Patient / Owner Selector ─────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'المريض أو المالك' : 'Patient / Client'} *
                </label>

                {!patient && !preselectedPatient && (
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectMode('pet')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        selectMode === 'pet'
                          ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {isAr ? 'حسب الحيوان' : 'By Pet'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectMode('owner')}
                      className={`px-2.5 py-0.5 rounded-md transition-all ${
                        selectMode === 'owner'
                          ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {isAr ? 'حسب المالك' : 'By Owner'}
                    </button>
                  </div>
                )}
              </div>

              {patient ? (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{speciesEmoji(patient.species)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {patient.name}{' '}
                        <span className="text-[10px] text-slate-400 font-semibold capitalize">
                          ({patient.species})
                        </span>
                      </p>
                      {patient.owner && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {patient.owner.name} • {patient.owner.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {!preselectedPatient && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatient(null)
                        setSelectedOwner(null)
                        setOwnerPets([])
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : selectMode === 'pet' ? (
                <div className="relative">
                  <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={ptSearch}
                    onChange={(e) => searchPatients(e.target.value)}
                    placeholder={
                      isAr ? 'ابحث باسم الحيوان أو رقم الهاتف...' : 'Search pet name, breed, or phone…'
                    }
                    className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`}
                  />
                  {ptSearching && (
                    <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                  )}

                  {ptResults.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto text-xs">
                      {ptResults.map((p) => (
                        <li
                          key={p.id}
                          onMouseDown={() => {
                            setPatient(p)
                            setPtResults([])
                            setPtSearch('')
                          }}
                          className="px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{speciesEmoji(p.species)}</span>
                            <span>{p.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                            {p.species} {p.owner?.name ? `• ${p.owner.name} (${p.owner.phone})` : ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                /* Owner Search Mode */
                <div className="space-y-2">
                  {!selectedOwner ? (
                    <div className="relative">
                      <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        value={ownerSearch}
                        onChange={(e) => searchOwners(e.target.value)}
                        placeholder={
                          isAr ? 'ابحث باسم المالك أو رقم الهاتف...' : 'Search owner name or phone…'
                        }
                        className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`}
                      />
                      {ownerSearching && (
                        <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                      )}

                      {ownerResults.length > 0 && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto text-xs">
                          {ownerResults.map((o) => (
                            <li
                              key={o.id}
                              onMouseDown={() => selectOwner(o)}
                              className="px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{o.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{o.phone}</p>
                              </div>
                              <Users size={14} className="text-slate-400" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    /* Owner Selected: Pick Pet or Book General */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <UserCheck size={16} className="text-violet-600" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {selectedOwner.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{selectedOwner.phone}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOwner(null)
                            setOwnerPets([])
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {ownerPetsLoading ? (
                        <div className="py-3 flex justify-center text-slate-400">
                          <Loader2 size={16} className="animate-spin" />
                        </div>
                      ) : (
                        <>
                          {ownerPets.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {ownerPets.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setPatient({ ...p, owner: selectedOwner })}
                                  className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-left rtl:text-right bg-white dark:bg-slate-800 transition-all"
                                >
                                  <span className="text-base">{speciesEmoji(p.species)}</span>
                                  <span className="text-xs font-bold truncate">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Direct Booking without specific pet */}
                          <button
                            type="button"
                            onClick={useGeneralBooking}
                            className="w-full py-2 text-xs font-bold text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all flex items-center justify-center gap-1.5"
                          >
                            <PawPrint size={13} />
                            <span>
                              {isAr
                                ? 'حجز عام للمالك بدون تحديد حيوان مسبقاً'
                                : 'General booking under client name'}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
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
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
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

              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
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
                    : `Warning: Slot conflicts with ${currentConflict.patientName || 'another booking'}`}
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
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={inputCls}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {isAr ? cfg.labelAr : cfg.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Attending Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'الطبيب البيطري المعالج (اختياري)' : 'Attending Veterinarian (Optional)'}
              </label>
              <select
                value={vetName}
                onChange={(e) => setVetName(e.target.value)}
                className={inputCls}
              >
                <option value="">{isAr ? '— بدون تحديد طبيب معين —' : '— No specific doctor —'}</option>
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
              className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-95"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isEdit ? (
                isAr ? 'حفظ التعديلات' : 'Save Changes'
              ) : (
                isAr ? 'تأكيد الحجز' : 'Confirm Booking'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}