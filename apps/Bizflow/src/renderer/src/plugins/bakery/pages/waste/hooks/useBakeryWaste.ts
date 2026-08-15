import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  WasteLog,
  WasteSummary,
  Recipe,
  PantryItem,
  WasteType,
  WasteFormData,
} from '../types'
import { DEFAULT_PAGE_SIZE } from '../constants'

export function useBakeryWaste() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [logs, setLogs] = useState<WasteLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(1)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [summary, setSummary] = useState<WasteSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [filterType, setFilterType] = useState<WasteType | 'all'>('all')
  const [filterReason, setFilterReason] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(
    async (type?: WasteType | 'all', targetPage?: number) => {
      setLoading(true)
      try {
        const activeFilter = type ?? filterType
        const activePage = targetPage ?? page

        const [logData, recipeData, pantryData, summaryData] = await Promise.all([
          window.api.bakery.getWasteLogs({
            wasteType: activeFilter !== 'all' ? activeFilter : undefined,
            page: activePage,
            pageSize,
          }),
          window.api.bakery.getRecipes(),
          window.api.bakery.getPantry(),
          window.api.bakery.getWasteSummary(),
        ])

        if (logData && typeof logData === 'object' && 'data' in logData) {
          setLogs(logData.data ?? [])
          setTotalLogs(logData.total ?? 0)
          setTotalPages(logData.totalPages ?? 1)
          setPage(logData.page ?? 1)
        } else {
          setLogs(Array.isArray(logData) ? logData : [])
          setTotalLogs(Array.isArray(logData) ? logData.length : 0)
          setTotalPages(1)
        }

        setRecipes(Array.isArray(recipeData) ? recipeData : [])
        setPantryItems(Array.isArray(pantryData) ? pantryData : [])
        setSummary(summaryData)
      } catch (err: any) {
        showToast('error', err?.message || t('bakeryWasteLoadFailed') || 'Failed to load waste logs')
      } finally {
        setLoading(false)
      }
    },
    [filterType, page, pageSize, showToast, t]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const applyTypeFilter = (type: WasteType | 'all') => {
    setFilterType(type)
    setPage(1)
    loadData(type, 1)
  }

  const handleSaveWaste = async (formData: WasteFormData) => {
    const qty = parseFloat(formData.quantity)
    const unitCost = parseFloat(formData.cost) || 0
    const totalCost = qty * unitCost

    const payload = {
      wasteType: formData.wasteType,
      recipeId: formData.recipeId || undefined,
      productId: formData.productId || undefined,
      pantryIngredientId: formData.pantryIngredientId || undefined,
      itemName: formData.itemName.trim(),
      quantity: qty,
      unit: formData.unit,
      cost: totalCost > 0 ? totalCost : unitCost,
      reason: formData.reason || undefined,
      wasteDate: formData.wasteDate,
      notes: formData.notes.trim() || undefined,
    }

    await window.api.bakery.createWasteLog(payload)
    showToast('success', t('bakeryWasteLoggedSuccess') || 'Waste record successfully created')
    setShowForm(false)
    loadData()
  }

  const handleDeleteWaste = async (id: string) => {
    try {
      await window.api.bakery.deleteWasteLog(id)
      showToast('success', t('bakeryWasteDeleted' )|| 'Waste log removed')
      setDeletingId(null)
      loadData()
    } catch {
      showToast('error', t('bakeryWasteDeleteFailed') || 'Failed to delete waste log')
    }
  }

  // Local Client Filter for instant search + reason
  const visibleLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return logs.filter(log => {
      const matchSearch =
        !query ||
        log.itemName.toLowerCase().includes(query) ||
        (log.notes && log.notes.toLowerCase().includes(query)) ||
        (log.recipe && log.recipe.name.toLowerCase().includes(query)) ||
        (log.product && log.product.name.toLowerCase().includes(query))

      const matchReason = !filterReason || log.reason === filterReason

      return matchSearch && matchReason
    })
  }, [logs, searchQuery, filterReason])

  return {
    logs: visibleLogs,
    totalLogs,
    page,
    totalPages,
    pageSize,
    setPage: (p: number) => {
      setPage(p)
      loadData(filterType, p)
    },
    recipes,
    pantryItems,
    summary,
    loading,
    filterType,
    applyTypeFilter,
    filterReason,
    setFilterReason,
    searchQuery,
    setSearchQuery,
    showForm,
    setShowForm,
    deletingId,
    setDeletingId,
    handleSaveWaste,
    handleDeleteWaste,
    refresh: () => loadData(),
  }
}