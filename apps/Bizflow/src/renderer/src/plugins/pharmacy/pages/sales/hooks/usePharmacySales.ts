import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacySale, PaymentStatus, SaleStatus } from '../types'
import { SALES_PAGE_SIZE } from '../constants'
import { computeSalesMetrics } from '../utils'

export function usePharmacySales(toast: any) {
  const [sales, setSales] = useState<PharmacySale[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('all')
  const [status, setStatus] = useState<SaleStatus>('all')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSales = useCallback(async () => {
    setLoading(true)
    try {
      const response = await pharma()?.sales.getAll({
        search: search.trim(),
        paymentStatus,
        status,
        skip: page * SALES_PAGE_SIZE,
        take: SALES_PAGE_SIZE,
      })
      setSales(response?.data ?? [])
      setTotalCount(response?.total ?? 0)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load sales')
    } finally {
      setLoading(false)
    }
  }, [search, paymentStatus, status, page, toast])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(loadSales, 200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [loadSales])

  useEffect(() => {
    setPage(0)
  }, [search, paymentStatus, status])

  const metrics = useMemo(() => computeSalesMetrics(sales), [sales])
  const pageCount = Math.max(1, Math.ceil(totalCount / SALES_PAGE_SIZE))

  return {
    sales,
    totalCount,
    page,
    pageCount,
    loading,
    search,
    paymentStatus,
    status,
    metrics,
    setPage,
    setSearch,
    setPaymentStatus,
    setStatus,
    reload: loadSales,
  }
}