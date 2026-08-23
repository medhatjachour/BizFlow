import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacySupplierItem } from '../types'
import { SUPPLIERS_PAGE_SIZE } from '../constants'
import { computeSuppliersMetrics } from '../utils'

export function usePharmacySuppliers(toast: any) {
  const [rows, setRows] = useState<PharmacySupplierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await pharma()?.suppliers.getAll({ search: search.trim() })
      setRows(data ?? [])
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load supplier directory')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(loadSuppliers, 200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [loadSuppliers])

  useEffect(() => {
    setPage(0)
  }, [search])

  const metrics = useMemo(() => computeSuppliersMetrics(rows), [rows])
  const pageCount = Math.max(1, Math.ceil(rows.length / SUPPLIERS_PAGE_SIZE))
  const pagedRows = useMemo(() => {
    const start = page * SUPPLIERS_PAGE_SIZE
    return rows.slice(start, start + SUPPLIERS_PAGE_SIZE)
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
    reload: loadSuppliers,
  }
}