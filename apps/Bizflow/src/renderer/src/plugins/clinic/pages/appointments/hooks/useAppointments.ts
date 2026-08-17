import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { getWeekDates, toArray } from '../utils'
import { DEFAULT_PAGE_SIZE } from '../constants'
import type { Appointment } from '../types'

export function useAppointments(selectedDate: string, viewMode: 'day' | 'week') {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [weekAppts, setWeekAppts] = useState<Record<string, Appointment[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadData = useCallback(
    async (pageSkip: number = 0) => {
      const isInitial = pageSkip === 0
      if (isInitial) setLoading(true)
      else setLoadingMore(true)

      try {
        if (viewMode === 'day') {
          const response = await (window.api.clinic.appointments.getAll as any)({
            date: selectedDate,
            skip: pageSkip,
            take: DEFAULT_PAGE_SIZE
          })

          if (Array.isArray(response)) {
            if (isInitial) {
              setAppointments(response)
              setTotal(response.length)
              setHasMore(false)
              setSkip(0)
            } else {
              setAppointments((prev) => [...prev, ...response])
              setSkip(pageSkip + response.length)
              setTotal(response.length)
              setHasMore(false)
            }
          } else {
            if (isInitial) {
              setAppointments(response.data ?? [])
              setSkip(pageSkip)
            } else {
              setAppointments((prev) => [...prev, ...(response.data ?? [])])
              setSkip(pageSkip + (response.data?.length ?? 0))
            }
            setTotal(response.total ?? 0)
            setHasMore(Boolean(response.hasMore))
          }
        } else {
          // Week View Mode
          const days = getWeekDates(selectedDate)
          const results = await Promise.all(
            days.map((d) => window.api.clinic.appointments.getAll({ date: d }).catch(() => []))
          )
          const map: Record<string, Appointment[]> = {}
          days.forEach((d, i) => {
            map[d] = toArray<Appointment>(results[i])
          })
          setWeekAppts(map)
        }
      } catch {
        showToast('error', t('errorLoadingData'))
      } finally {
        if (isInitial) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [selectedDate, viewMode, showToast, t]
  )

  useEffect(() => {
    setSkip(0)
    loadData(0)
  }, [selectedDate, viewMode, loadData])

  const deleteAppointment = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.appointments.delete(id)
      showToast('success', t('appointmentDeleted'))
      loadData(0)
    } catch {
      showToast('error', t('failedDeleteAppointment'))
    }
  }

  const updateStatus = async (appt: Appointment, status: string) => {
    setUpdatingId(appt.id)
    try {
      await window.api.clinic.appointments.update(appt.id, { status })
      showToast('success', t('appointmentUpdated'))
      loadData(0)
    } catch {
      showToast('error', t('failedUpdateStatus'))
    } finally {
      setUpdatingId(null)
    }
  }

  return {
    appointments,
    weekAppts,
    loading,
    loadingMore,
    hasMore,
    total,
    skip,
    updatingId,
    loadMore: () => loadData(skip + DEFAULT_PAGE_SIZE),
    reload: () => loadData(0),
    deleteAppointment,
    updateStatus
  }
}