import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Patient, PatientFilterState, PaginatedPatientResponse } from '../types'
import { PAGE_SIZE, DEFAULT_FILTER_STATE } from '../constants'

export function usePatients() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filters, setFilters] = useState<PatientFilterState>(DEFAULT_FILTER_STATE)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [skip, setSkip] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchPatients = useCallback(async (currentFilters: PatientFilterState, pageSkip = 0) => {
    const isInitial = pageSkip === 0
    if (isInitial) setLoading(true)
    else setLoadingMore(true)

    try {
      const response = await (window.api.clinic.patients.getAll as any)({
        search: currentFilters.search || undefined,
        skip: pageSkip,
        take: PAGE_SIZE
      })

      if (Array.isArray(response)) {
        setPatients(response)
        setTotal(response.length)
        setHasMore(false)
        setSkip(0)
      } else {
        const paginated = response as PaginatedPatientResponse
        if (isInitial) {
          setPatients(paginated.data || [])
          setSkip(0)
        } else {
          setPatients(prev => [...prev, ...(paginated.data || [])])
          setSkip(pageSkip)
        }
        setTotal(paginated.total || 0)
        setHasMore(paginated.hasMore || false)
      }
    } catch (err) {
      showToast('error', t('errorLoadingData') || 'Failed to load patients')
    } finally {
      if (isInitial) setLoading(false)
      else setLoadingMore(false)
    }
  }, [showToast, t])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(filters, 0)
    }, filters.search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [filters.search, fetchPatients])

  const reload = useCallback(() => {
    fetchPatients(filters, 0)
  }, [fetchPatients, filters])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPatients(filters, skip + PAGE_SIZE)
    }
  }, [fetchPatients, filters, hasMore, loadingMore, skip])

  const deletePatient = useCallback(async (id: string) => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this patient record?')) return
    try {
      await window.api.clinic.patients.delete(id)
      showToast('success', t('deletedSuccessfully') || 'Patient deleted successfully')
      reload()
    } catch {
      showToast('error', t('errorDeletingRecord') || 'Could not delete patient')
    }
  }, [reload, showToast, t])

  // Client-side filtering & sorting
  const processedPatients = useMemo(() => {
    let result = [...patients]

    if (filters.gender) {
      result = result.filter(p => p.gender === filters.gender)
    }
    if (filters.bloodType) {
      result = result.filter(p => p.bloodType === filters.bloodType)
    }
    if (filters.hasOutstandingOnly) {
      result = result.filter(p => (p.finance?.outstanding ?? 0) > 0)
    }

    result.sort((a, b) => {
      let comparison = 0
      if (filters.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (filters.sortBy === 'outstanding') {
        comparison = (b.finance?.outstanding ?? 0) - (a.finance?.outstanding ?? 0)
      } else if (filters.sortBy === 'recentVisit') {
        const dateA = a.sessions?.[0]?.visitDate ? new Date(a.sessions[0].visitDate).getTime() : 0
        const dateB = b.sessions?.[0]?.visitDate ? new Date(b.sessions[0].visitDate).getTime() : 0
        comparison = dateB - dateA
      } else if (filters.sortBy === 'createdAt') {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [patients, filters])

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalOutstanding = patients.reduce((sum, p) => sum + (p.finance?.outstanding ?? 0), 0)
    const withOutstandingCount = patients.filter(p => (p.finance?.outstanding ?? 0) > 0).length
    const totalSessions = patients.reduce((sum, p) => sum + (p._count?.sessions ?? p.sessions?.length ?? 0), 0)
    return {
      totalPatients: total || patients.length,
      totalOutstanding,
      withOutstandingCount,
      totalSessions
    }
  }, [patients, total])

  return {
    patients: processedPatients,
    rawCount: patients.length,
    loading,
    loadingMore,
    hasMore,
    total,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    reload,
    loadMore,
    deletePatient,
    stats
  }
}