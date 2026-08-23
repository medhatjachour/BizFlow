import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacyCustomerItem } from '../types'
import { CUSTOMERS_PAGE_SIZE } from '../constants'
import { computeCustomersMetrics } from '../utils'

export function usePharmacyCustomers(toast: any) {
  const [rows, setRows] = useState<PharmacyCustomerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await pharma()?.customers.getAll({ search: search.trim() })
      setRows(data ?? [])
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load customer directory')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(loadCustomers, 220)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [loadCustomers])

  useEffect(() => {
    setPage(0)
  }, [search])

  const metrics = useMemo(() => computeCustomersMetrics(rows), [rows])
  const pageCount = Math.max(1, Math.ceil(rows.length / CUSTOMERS_PAGE_SIZE))
  const pagedRows = useMemo(() => {
    const start = page * CUSTOMERS_PAGE_SIZE
    return rows.slice(start, start + CUSTOMERS_PAGE_SIZE)
  }, [rows, page])

  return {
    rows,
    pagedRows,
    totalCount: rows.length,
    page,
    pageCount,
    loading,
    search,
    metrics,
    setPage,
    setSearch,
    reload: loadCustomers,
  }
}