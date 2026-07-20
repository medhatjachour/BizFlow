import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Product, Category, StockMovement, FilterMode, AdjustForm } from '../types'
import { filterProducts, groupByCategory, computeKPIs } from '../utils'
import { PAGE_SIZE } from '../constants'

const EMPTY_ADJUST: AdjustForm = { type: 'restock', quantity: '1', reason: '' }

export function useInventory(toast: any) {
  // ── Data ──
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // ── UI state ──
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // ── Adjustment modal ──
  const [adjProduct, setAdjProduct] = useState<Product | null>(null)
  const [adjForm, setAdjForm] = useState<AdjustForm>({ ...EMPTY_ADJUST })
  const [adjusting, setAdjusting] = useState(false)

  // ── History drawer (NEW: pagination + filters) ──
  const [histProduct, setHistProduct] = useState<Product | null>(null)
  const [allMovements, setAllMovements] = useState<StockMovement[]>([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [histPeriod, setHistPeriod] = useState<string>('30days')
  const [histType, setHistType] = useState<string>('all')
  const [histPage, setHistPage] = useState(1)

  // ── Load main data ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        window.api.coffee.products.getAll(),
        window.api.coffee.categories.getAll()
      ])
      setProducts(prods ?? [])
      setCategories(cats ?? [])
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  // ── Derived ──
  const kpis = useMemo(() => computeKPIs(products), [products])

  const filtered = useMemo(
    () => filterProducts(products, filter, search),
    [products, filter, search]
  )

  const groups = useMemo(() => groupByCategory(filtered, categories), [filtered, categories])

  // ── Collapse ──
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  // ── Adjustment ──
  const openAdjust = useCallback((p: Product) => {
    setAdjProduct(p)
    setAdjForm({ ...EMPTY_ADJUST })
  }, [])

  const closeAdjust = useCallback(() => {
    setAdjProduct(null)
    setAdjForm({ ...EMPTY_ADJUST })
  }, [])

  const patchAdjust = useCallback((patch: Partial<AdjustForm>) => {
    setAdjForm((prev) => ({ ...prev, ...patch }))
  }, [])

const submitAdjust = useCallback(async () => {
  if (!adjProduct) return

  // The modal now sends the computed delta
  // But since we're calling from the hook, we need to compute it here too
  const qty = parseInt(adjForm.quantity, 10)
  if (isNaN(qty)) { toast.error('Enter a quantity'); return }

  let finalQty: number
  if (adjForm.type === 'adjustment') {
    // Correction: delta = newCount - currentStock
    finalQty = qty - adjProduct.stock
  } else if (adjForm.type === 'waste' || adjForm.type === 'write_off') {
    finalQty = -Math.abs(qty)
  } else {
    finalQty = Math.abs(qty)
  }

  if (finalQty === 0) { toast.error('No change to apply'); return }

  setAdjusting(true)
  try {
    await window.api.coffee.inventory.adjust({
      productId: adjProduct.id,
      quantity: finalQty,
      type: adjForm.type,
      reason: adjForm.reason || undefined,
    })
    toast.success(
      finalQty > 0
        ? `Added ${finalQty} units`
        : `Removed ${Math.abs(finalQty)} units`
    )
    closeAdjust()
    load()
  } catch (err: any) {
    toast.error(err?.message ?? 'Failed to adjust stock')
  } finally {
    setAdjusting(false)
  }
}, [adjProduct, adjForm, closeAdjust, load, toast])

  // ── History: load ALL movements, filter client-side ──
  const openHistory = useCallback(
    async (p: Product) => {
      setHistProduct(p)
      setHistPeriod('30days')
      setHistType('all')
      setHistPage(1)
      setLoadingHist(true)
      try {
        const data = await window.api.coffee.inventory.getMovements(p.id)
        // Sort newest first
        setAllMovements(
          (data ?? []).sort(
            (a: StockMovement, b: StockMovement) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        )
      } catch {
        toast.error('Failed to load history')
        setAllMovements([])
      } finally {
        setLoadingHist(false)
      }
    },
    [toast]
  )

  const closeHistory = useCallback(() => {
    setHistProduct(null)
    setAllMovements([])
    setHistPage(1)
  }, [])

  // ── History: filtered + paginated (client-side) ──
  const filteredMovements = useMemo(() => {
    let result = allMovements

    // Date filter
    if (histPeriod !== 'all') {
      const now = new Date()
      const cutoff = new Date(now)
      if (histPeriod === 'today') cutoff.setHours(0, 0, 0, 0)
      if (histPeriod === '7days') cutoff.setDate(cutoff.getDate() - 7)
      if (histPeriod === '30days') cutoff.setDate(cutoff.getDate() - 30)
      if (histPeriod === '90days') cutoff.setDate(cutoff.getDate() - 90)
      result = result.filter((m) => new Date(m.createdAt) >= cutoff)
    }

    // Type filter
    if (histType !== 'all') {
      result = result.filter((m) => m.type === histType)
    }

    return result
  }, [allMovements, histPeriod, histType])

  const totalHistPages = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE))
  const currentHistPage = Math.min(histPage, totalHistPages)
  const paginatedMovements = useMemo(
    () => filteredMovements.slice((currentHistPage - 1) * PAGE_SIZE, currentHistPage * PAGE_SIZE),
    [filteredMovements, currentHistPage]
  )

  // ── History: summary stats ──
  const histStats = useMemo(() => {
    const incoming = filteredMovements
      .filter((m) => m.quantity > 0)
      .reduce((s, m) => s + m.quantity, 0)
    const outgoing = filteredMovements
      .filter((m) => m.quantity < 0)
      .reduce((s, m) => s + Math.abs(m.quantity), 0)
    return {
      total: filteredMovements.length,
      incoming,
      outgoing,
      net: incoming - outgoing
    }
  }, [filteredMovements])

  // ── History: filter changes reset page ──
  useEffect(() => {
    setHistPage(1)
  }, [histPeriod, histType])

  return {
    // data
    products,
    categories,
    loading,
    kpis,
    groups,
    // ui
    filter,
    setFilter,
    search,
    setSearch,
    collapsed,
    toggleCollapse,
    // adjustment
    adjProduct,
    adjForm,
    patchAdjust,
    adjusting,
    openAdjust,
    closeAdjust,
    submitAdjust,
    // history (enhanced)
    histProduct,
    movements: paginatedMovements,
    allMovementsCount: filteredMovements.length,
    loadingHist,
    openHistory,
    closeHistory,
    histPeriod,
    setHistPeriod,
    histType,
    setHistType,
    histPage: currentHistPage,
    setHistPage,
    totalHistPages,
    histStats,
    // reload
    load
  }
}
