import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacyProductItem, StockFilterType } from '../types'
import { PRODUCTS_PAGE_SIZE } from '../constants'
import { computeProductsMetrics } from '../utils'

export function usePharmacyProducts(toast: any) {
  const [rows, setRows] = useState<PharmacyProductItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await pharma()?.products.getAll({
        search: search.trim(),
        category,
        stockFilter,
        status: 'all',
        skip: page * PRODUCTS_PAGE_SIZE,
        take: PRODUCTS_PAGE_SIZE,
        sortBy: 'name',
      })
      setRows(response?.data ?? [])
      setTotal(response?.total ?? 0)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [search, category, stockFilter, page, toast])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(loadProducts, 220)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [loadProducts])

  useEffect(() => {
    setPage(0)
  }, [search, category, stockFilter])

  useEffect(() => {
    pharma()?.products.getCategories().then((res: string[]) => setCategories(res ?? [])).catch(() => {})
  }, [])

  const metrics = useMemo(() => computeProductsMetrics(rows), [rows])
  const pageCount = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE))

  return {
    rows,
    total,
    page,
    pageCount,
    loading,
    search,
    category,
    stockFilter,
    categories,
    metrics,
    setPage,
    setSearch,
    setCategory,
    setStockFilter,
    reload: loadProducts,
  }
}