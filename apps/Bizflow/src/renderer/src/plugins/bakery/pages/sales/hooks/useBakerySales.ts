import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  Recipe,
  PagedSalesResult,
  SalesSummary,
  SellableBatch,
  RecipeGroup,
  PosFilterType,
  SalesSubTab,
  CustomSaleFormData,
} from '../types'
import { getTodayDateString, daysUntil } from '../utils'

export function useBakerySales() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const bakeryApi = window.api.bakery as any

  // ── Core Data ──
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pagedSales, setPagedSales] = useState<PagedSalesResult | null>(null)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [sellableBatches, setSellableBatches] = useState<SellableBatch[]>([])
  const [loading, setLoading] = useState(true)

  // ── Tabs & POS Navigation ──
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>('sell')
  const [posFilter, setPosFilter] = useState<PosFilterType>('')
  const [searchQuery, setSearchQuery] = useState('')

  // ── History Filters & Pagination ──
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterRecipe, setFilterRecipe] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [showHistoryFilters, setShowHistoryFilters] = useState(false)

  // ── Modals & Action States ──
  const [selectedGroup, setSelectedGroup] = useState<RecipeGroup | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null)

  // ── Data Fetching ──
  const loadHistory = useCallback(async () => {
    try {
      const opts: any = { page, pageSize }
      if (filterRecipe) opts.recipeId = filterRecipe
      if (filterStart) opts.startDate = filterStart
      if (filterEnd) opts.endDate = filterEnd

      const [r, result, sum] = await Promise.all([
        window.api.bakery.getRecipes(),
        bakeryApi.getSales(opts),
        bakeryApi.getSalesSummary(
          filterStart || filterEnd
            ? { startDate: filterStart || undefined, endDate: filterEnd || undefined }
            : {}
        ),
      ])
      setRecipes(r ?? [])
      setPagedSales(result)
      setSummary(sum)
    } catch (err: any) {
      showToast('error', err?.message || (t('bakerySaleLoadFailed') || 'Failed to load sales history'))
    }
  }, [page, pageSize, filterRecipe, filterStart, filterEnd, showToast, t])

  const loadSellableBatches = useCallback(async () => {
    try {
      const batches = await bakeryApi.getSellableBatches()
      setSellableBatches(batches ?? [])
    } catch {
      /* silent */
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadHistory(), loadSellableBatches()])
    setLoading(false)
  }, [loadHistory, loadSellableBatches])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // ── Group Batches by Recipe ──
  const recipeGroups = useMemo<RecipeGroup[]>(() => {
    const map = new Map<string, RecipeGroup>()
    for (const b of sellableBatches) {
      if (!map.has(b.recipe.id)) {
        map.set(b.recipe.id, {
          recipe: b.recipe,
          batches: [],
          totalAvailable: 0,
          earliestExpiry: null,
        })
      }
      const g = map.get(b.recipe.id)!
      g.batches.push(b)
      g.totalAvailable += b.unitsAvailable
      if (b.expiresAt && (!g.earliestExpiry || b.expiresAt < g.earliestExpiry)) {
        g.earliestExpiry = b.expiresAt
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.earliestExpiry && b.earliestExpiry) {
        return a.earliestExpiry < b.earliestExpiry ? -1 : 1
      }
      if (a.earliestExpiry) return -1
      if (b.earliestExpiry) return 1
      return a.recipe.name.localeCompare(b.recipe.name)
    })
  }, [sellableBatches])

  const filteredGroups = useMemo(() => {
    let groups = recipeGroups
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      groups = groups.filter(g => g.recipe.name.toLowerCase().includes(q))
    }
    if (posFilter === 'expiring') {
      groups = groups.filter(g => g.earliestExpiry && daysUntil(g.earliestExpiry) <= 3)
    }
    if (posFilter === 'noprice') {
      groups = groups.filter(g => !g.recipe.sellingPrice || g.recipe.sellingPrice <= 0)
    }
    return groups
  }, [recipeGroups, searchQuery, posFilter])

  // ── Actions ──
  const handleRecordBatchSale = async (payload: {
    batchId: string
    recipeId: string
    itemName: string
    quantity: number
    unitPrice: number
    saleDate: string
    notes?: string
  }) => {
    await bakeryApi.createSale(payload)
    showToast('success', t('bakerySaleRecorded') || 'Sale completed successfully!')
    setSelectedGroup(null)
    setPage(1)
    await Promise.all([loadHistory(), loadSellableBatches()])
  }

  const handleRecordCustomSale = async (formData: CustomSaleFormData) => {
    const qty = parseFloat(formData.quantity)
    const price = parseFloat(formData.unitPrice)
    await bakeryApi.createSale({
      recipeId: formData.recipeId || undefined,
      itemName: formData.itemName.trim(),
      quantity: qty,
      unitPrice: price,
      saleDate: formData.saleDate || getTodayDateString(),
      notes: formData.notes.trim() || undefined,
    })
    showToast('success', t('bakeryCustomSaleRecorded') || 'Custom sale recorded!')
    setShowCustomModal(false)
    setPage(1)
    await Promise.all([loadHistory(), loadSellableBatches()])
  }

  const handleSaveRecipePrice = async (recipeId: string, price: number) => {
    await window.api.bakery.updateRecipe({ id: recipeId, sellingPrice: price })
    showToast('success', t('bakeryPriceUpdated') || 'Default selling price updated')
    await Promise.all([loadHistory(), loadSellableBatches()])
  }

  const handleDeleteSale = async (id: string) => {
    try {
      await bakeryApi.deleteSale(id)
      showToast('success', t('bakerySaleDeleted') || 'Sale record removed')
      setDeletingSaleId(null)
      await loadHistory()
    } catch (err: any) {
      showToast('error', err?.message || (t('bakerySaleDeleteFailed') || 'Failed to delete sale'))
    }
  }

  return {
    recipes,
    pagedSales,
    summary,
    loading,
    recipeGroups,
    filteredGroups,
    activeSubTab,
    setActiveSubTab,
    posFilter,
    setPosFilter,
    searchQuery,
    setSearchQuery,
    // History Filters & Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    filterRecipe,
    setFilterRecipe,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    showHistoryFilters,
    setShowHistoryFilters,
    clearHistoryFilters: () => {
      setFilterRecipe('')
      setFilterStart('')
      setFilterEnd('')
      setPage(1)
    },
    // Modals
    selectedGroup,
    setSelectedGroup,
    showCustomModal,
    setShowCustomModal,
    deletingSaleId,
    setDeletingSaleId,
    // Handlers
    handleRecordBatchSale,
    handleRecordCustomSale,
    handleSaveRecipePrice,
    handleDeleteSale,
  }
}