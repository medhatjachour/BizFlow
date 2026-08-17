import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { toDatetimeLocal, buildTimeSlots, toArray } from '../utils'
import type { Appointment, AppointmentFormData, DoctorOption, SlotStatusResult } from '../types'
import { isSingleDoctorMode, resolveDefaultDoctorId } from '../../components/doctors/doctors.shared'

export function useAppointmentForm(
  existing?: Appointment | null,
  defaultDate?: string | null,
  defaultPatientId?: string | null,
  defaultPatientName?: string | null,
  onSaved?: (date?: string) => void
) {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const initDateTime = useCallback(() => {
    if (existing?.appointmentDate) return toDatetimeLocal(existing.appointmentDate)
    if (defaultDate) return `${defaultDate}T09:00`
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
    return toDatetimeLocal(d.toISOString())
  }, [existing, defaultDate])

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AppointmentFormData>({
    patientId: existing?.patientId ?? defaultPatientId ?? '',
    appointmentDate: initDateTime(),
    duration: String(existing?.duration ?? 30),
    type: existing?.type ?? 'consultation',
    doctorName: existing?.doctorName ?? '',
    doctorId: existing?.doctorId ?? '',
    notes: existing?.notes ?? '',
    status: existing?.status ?? 'scheduled',
    amountCharged: String(existing?.amountCharged ?? ''),
    amountPaid: String(existing?.amountPaid ?? ''),
    paymentMethod: existing?.paymentMethod ?? 'cash'
  })

  const [searchQuery, setSearchQuery] = useState(existing?.patient?.name ?? defaultPatientName ?? '')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [dayAppts, setDayAppts] = useState<Appointment[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const singleDoctor = isSingleDoctorMode()
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load doctors list and apply default
  useEffect(() => {
    window.api.clinic.doctors
      .list()
      .then((rows: any[]) => {
        const list = rows ?? []
        setDoctors(list)
        if (!existing?.id) {
          const def = resolveDefaultDoctorId(list)
          if (def) {
            setForm((f) =>
              f.doctorId ? f : { ...f, doctorId: def, doctorName: list.find((x: any) => x.id === def)?.name ?? '' }
            )
          }
        }
      })
      .catch(() => {})
  }, [existing])

  const selectedDay = form.appointmentDate.slice(0, 10)
  const selectedTime = form.appointmentDate.slice(11, 16)

  // Fetch booked slots for the day
  useEffect(() => {
    if (!selectedDay || selectedDay.length < 10) return
    let cancelled = false
    setLoadingSlots(true)
    ;(window.api.clinic.appointments.getAll as any)({ date: selectedDay, skip: 0, take: 500 })
      .then((res: any) => {
        if (cancelled) return
        setDayAppts(toArray<Appointment>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDay])

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      setSearching(true)
      try {
        setSearchResults((await window.api.clinic.patients.searchLite(query)) ?? [])
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  const selectPatient = (patient: any) => {
    setForm((f) => ({ ...f, patientId: patient.id }))
    setSearchQuery(patient.name)
    setSearchResults([])
  }

  const getSlotStatus = useCallback(
    (slotTime: string): SlotStatusResult => {
      const todayStr = toDatetimeLocal(new Date().toISOString()).slice(0, 10)
      const nowHHMM = (() => {
        const n = new Date()
        return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
      })()

      if (selectedDay === todayStr && slotTime < nowHHMM) {
        return { state: 'past' }
      }

      const duration = Number(form.duration) || 30
      const slotStart = new Date(`${selectedDay}T${slotTime}:00`).getTime()
      const slotEnd = slotStart + duration * 60000

      for (const appt of dayAppts) {
        if (appt.id === existing?.id) continue
        if (!['scheduled', 'confirmed'].includes(appt.status)) continue

        const apptStart = new Date(appt.appointmentDate).getTime()
        const apptEnd = apptStart + (appt.duration || 30) * 60000

        if (slotStart < apptEnd && slotEnd > apptStart) {
          const isFullOverlap = slotStart >= apptStart && slotEnd <= apptEnd
          return {
            state: isFullOverlap ? 'booked' : 'overlap',
            patient: appt.patient?.name
          }
        }
      }
      return { state: 'available' }
    },
    [selectedDay, form.duration, dayAppts, existing]
  )

  const save = async () => {
    if (!form.patientId) {
      showToast('error', t('pleaseSelectPatient'))
      return
    }
    if (!form.appointmentDate) {
      showToast('error', t('pleaseSetDateTime'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        duration: Number(form.duration) || 30,
        doctorName: form.doctorName.trim() || null,
        doctorId: form.doctorId || null,
        notes: form.notes.trim() || null,
        amountCharged: form.amountCharged !== '' ? parseFloat(form.amountCharged) : null,
        amountPaid: form.amountPaid !== '' ? parseFloat(form.amountPaid) : null,
        paymentMethod: form.paymentMethod || null
      }

      if (existing?.id) {
        await window.api.clinic.appointments.update(existing.id, payload)
        showToast('success', t('appointmentUpdated'))
      } else {
        await window.api.clinic.appointments.create(payload)
        showToast('success', t('appointmentBooked'))
      }

      if (onSaved) onSaved(form.appointmentDate.slice(0, 10))
    } catch {
      showToast('error', t('failedSaveAppointment'))
    } finally {
      setSaving(false)
    }
  }

  return {
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
    timeSlots: buildTimeSlots(Number(form.duration) || 30),
    getSlotStatus,
    handleSearchChange,
    selectPatient,
    save
  }
}