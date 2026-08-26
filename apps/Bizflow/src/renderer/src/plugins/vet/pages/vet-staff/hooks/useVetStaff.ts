import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { VetStaff, StaffSortField, StaffViewMode } from '../types'

export function useVetStaff() {
  const toast = useToast()
  const [staffList, setStaffList] = useState<VetStaff[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [empTypeFilter, setEmpTypeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<StaffSortField>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [viewMode, setViewMode] = useState<StaffViewMode>('grid')
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStaff = useCallback(async (isSilent = false) => {
    if (isSilent) setIsRefreshing(true)
    else setLoading(true)

    try {
      const raw = (await window.api.vet?.staff.getAll()) as any
      if (raw) {
        const list: VetStaff[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : []

        setStaffList(list)
        setTotal(list.length)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load veterinarians')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const filteredAndSortedStaff = useMemo(() => {
    let result = [...staffList]

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      )
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }

    // 3. Employment Type Filter
    if (empTypeFilter !== 'all') {
      result = result.filter((s) => s.employmentType === empTypeFilter)
    }

    // 4. Sort
    result.sort((a, b) => {
      let valA: any = a[sortField] ?? ''
      let valB: any = b[sortField] ?? ''

      if (sortField === 'baseSalary') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return result
  }, [staffList, search, statusFilter, empTypeFilter, sortField, sortAsc])

  // Count summaries
  const metrics = useMemo(() => {
    const active = staffList.filter((s) => s.status === 'active').length
    const inactive = staffList.length - active
    const fullTime = staffList.filter((s) => s.employmentType === 'full_time').length
    return { active, inactive, fullTime, total: staffList.length }
  }, [staffList])

  return {
    staffList: filteredAndSortedStaff,
    rawCount: staffList.length,
    filteredCount: filteredAndSortedStaff.length,
    metrics,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    empTypeFilter,
    setEmpTypeFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    refresh: () => loadStaff(true)
  }
}