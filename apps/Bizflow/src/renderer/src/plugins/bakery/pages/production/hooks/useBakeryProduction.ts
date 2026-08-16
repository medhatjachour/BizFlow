import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  Recipe,
  ProductionBatch,
  PagedBatchesResult,
  AvailableBatchCapacity,
  LossReason,
} from '../types'

export function useBakeryProduction() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pagedBatches, setPagedBatches] = useState<PagedBatchesResult | null>(null)
  const [capacity, setCapacity] = useState<AvailableBatchCapacity[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Flows
  const [showLogModal, setShowLogModal] = useState(false)
  const [confirmParams, setConfirmParams] = useState<{
    recipeId: string
    quantity: number
    batchDate: string
    notes?: string
  } | null>(null)

  const [quickSellBatch, setQuickSellBatch] = useState<ProductionBatch | null>(null)
  const [logLossBatch, setLogLossBatch] = useState<ProductionBatch | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, result, cap] = await Promise.all([
        window.api.bakery.getRecipes(),
        window.api.bakery.getProductionBatches({ page, pageSize }),
        window.api.bakery.getAvailableBatches(),
      ])

      setRecipes(r ?? [])
      setPagedBatches(result)
      setCapacity(cap ?? [])
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryLoadDataFailed') || 'Failed to load production data'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // KPIs
  const batches = pagedBatches?.data ?? []
  const summaryKpis = useMemo(() => {
    const totalBatches = pagedBatches?.total ?? 0
    const totalProduced = batches.reduce((s, b) => s + b.unitsProduced, 0)
    const totalSold = batches.reduce((s, b) => s + (b.unitsSold ?? 0), 0)
    const totalLost = batches.reduce((s, b) => s + (b.unitsLost ?? 0), 0)
    const totalCost = batches.reduce((s, b) => s + (b.totalCost ?? 0), 0)

    return {
      totalBatches,
      totalProduced,
      totalSold,
      totalLost,
      totalCost,
    }
  }, [batches, pagedBatches])

  // Client-side search filtering
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches
    const q = searchQuery.toLowerCase().trim()
    return batches.filter(
      b =>
        b.recipe.name.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q))
    )
  }, [batches, searchQuery])

  // Actions
  const handleCommitProduction = async (payload: {
    recipeId: string
    quantity: number
    batchDate: string
    notes?: string
  }) => {
    await window.api.bakery.createProductionBatch(payload)
    showToast('success', t('bakeryProductionRecorded') || 'Production batch successfully baked & logged!')
    setConfirmParams(null)
    setShowLogModal(false)
    setPage(1)
    await loadData()
  }

  const handleQuickSell = async (payload: {
    batchId: string
    recipeId: string
    itemName: string
    quantity: number
    unitPrice: number
    saleDate: string
    notes?: string
  }) => {
    await (window.api.bakery as any).createSale(payload)
    showToast('success', t('bakerySaleRecorded') || 'Sale deducted from batch stock!')
    setQuickSellBatch(null)
    await loadData()
  }

  const handleLogLoss = async (payload: {
    batch: ProductionBatch
    quantity: number
    reason: LossReason
    notes?: string
  }) => {
    const costPerUnit =
      payload.batch.unitsProduced > 0
        ? payload.batch.totalCost / payload.batch.unitsProduced
        : 0

    await window.api.bakery.createWasteLog({
      wasteType: 'production_batch',
      productionBatchId: payload.batch.id,
      recipeId: payload.batch.recipeId,
      itemName: payload.batch.recipe.name,
      quantity: payload.quantity,
      unit: payload.batch.recipe.yieldUnit,
      cost: payload.quantity * costPerUnit,
      reason: payload.reason,
      notes: payload.notes || undefined,
    })

    showToast('success', t('bakeryLossLogged') || 'Waste event logged & batch deducted')
    setLogLossBatch(null)
    await loadData()
  }

  const handleDeleteBatch = async (id: string) => {
    try {
      await window.api.bakery.deleteProductionBatch(id)
      showToast('success', t('bakeryBatchDeleted') || 'Production batch removed')
      setDeletingId(null)
      await loadData()
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryDeleteBatchFailed') || 'Failed to delete batch'))
    }
  }

  return {
    batches: filteredBatches,
    pagedBatches,
    recipes,
    capacity,
    loading,
    summaryKpis,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    // Modals
    showLogModal,
    setShowLogModal,
    confirmParams,
    setConfirmParams,
    quickSellBatch,
    setQuickSellBatch,
    logLossBatch,
    setLogLossBatch,
    deletingId,
    setDeletingId,
    // Handlers
    handleCommitProduction,
    handleQuickSell,
    handleLogLoss,
    handleDeleteBatch,
    refresh: loadData,
  }
}