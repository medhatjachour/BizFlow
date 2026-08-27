import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { VetAppointmentRecord, AppointmentViewMode, AppointmentMetrics } from '../types'
import { toIsoDateString, getWeekDatesList } from '../utils'

export function useVetAppointments() {
  const toast = useToast()
  const [selectedDate, setSelectedDate] = useState<string>(() => toIsoDateString(new Date()))
  const [appointments, setAppointments] = useState<VetAppointmentRecord[]>([])
  const [weekAppointmentsMap, setWeekAppointmentsMap] = useState<Record<string, VetAppointmentRecord[]>>({})
  const [viewMode, setViewMode] = useState<AppointmentViewMode>('day')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')

  const loadAppointments = useCallback(
    async (isSilent = false) => {
      if (isSilent) setIsRefreshing(true)
      else setLoading(true)

      try {
        if (viewMode === 'day' || viewMode === 'table') {
          const from = new Date(selectedDate + 'T00:00:00.000').toISOString()
          const to = new Date(selectedDate + 'T23:59:59.999').toISOString()
          const result = (await window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 300 })) as any
          const list: VetAppointmentRecord[] = result?.data ?? (Array.isArray(result) ? result : [])
          setAppointments(list)
        } else {
          const days = getWeekDatesList(selectedDate)
          const results = await Promise.all(
            days.map((d) => {
              const from = new Date(d + 'T00:00:00.000').toISOString()
              const to = new Date(d + 'T23:59:59.999').toISOString()
              return window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 300 }).catch(() => ({ data: [] }))
            })
          )

          const map: Record<string, VetAppointmentRecord[]> = {}
          days.forEach((dayStr, idx) => {
            const rowData = results[idx]?.data ?? (Array.isArray(results[idx]) ? results[idx] : [])
            map[dayStr] = rowData
          })
          setWeekAppointmentsMap(map)
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load appointments')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedDate, viewMode, toast]
  )

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const updateStatus = async (apptId: string, status: string) => {
    setUpdatingId(apptId)
    try {
      await window.api.vet?.appointments.update(apptId, { status })
      toast.success('Appointment status updated')
      loadAppointments(true)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteAppointment = async (apptId: string) => {
    try {
      await window.api.vet?.appointments.delete(apptId)
      toast.success('Appointment deleted')
      loadAppointments(true)
    } catch {
      toast.error('Delete failed')
    }
  }

  // Filtered Day / Table List
  const filteredAppointments = useMemo(() => {
    let list = [...appointments]

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      list = list.filter((a) => a.type === typeFilter)
    }
    if (doctorFilter !== 'all') {
      list = list.filter((a) => a.vetName === doctorFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.patient?.name?.toLowerCase().includes(q) ||
          a.patient?.owner?.name?.toLowerCase().includes(q) ||
          a.patient?.owner?.phone?.includes(q) ||
          a.vetName?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q)
      )
    }

    // Sort by appointment time
    list.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

    return list
  }, [appointments, statusFilter, typeFilter, doctorFilter, search])

  // Metrics
  const metrics: AppointmentMetrics = useMemo(() => {
    const list = viewMode === 'week' ? Object.values(weekAppointmentsMap).flat() : appointments
    let scheduled = 0
    let confirmed = 0
    let completed = 0
    let cancelled = 0
    let noShow = 0

    for (const a of list) {
      if (a.status === 'scheduled') scheduled++
      else if (a.status === 'confirmed') confirmed++
      else if (a.status === 'completed') completed++
      else if (a.status === 'cancelled') cancelled++
      else if (a.status === 'no_show') noShow++
    }

    return { total: list.length, scheduled, confirmed, completed, cancelled, noShow }
  }, [appointments, weekAppointmentsMap, viewMode])

  const attendingDoctors = useMemo(() => {
    const set = new Set<string>()
    for (const a of appointments) {
      if (a.vetName) set.add(a.vetName)
    }
    return Array.from(set)
  }, [appointments])

  return {
    selectedDate,
    setSelectedDate,
    appointments: filteredAppointments,
    weekAppointmentsMap,
    metrics,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    updatingId,
    refresh: () => loadAppointments(true),
    updateStatus,
    deleteAppointment,
    // Filters
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    doctorFilter,
    setDoctorFilter,
    attendingDoctors
  }
}