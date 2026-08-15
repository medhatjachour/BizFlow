import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  PantryIngredient,
  PantryFormData,
  PantryFilterStatus,
  AdjustStockMode,
  BulkRestockItem,
} from '../types'
import { isLowStock, needsReorder } from '../utils'

export function useBakeryPantry() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [items, setItems] = useState<PantryIngredient[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PantryFilterStatus>('all')

  // Modals
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryIngredient | null>(null)

  const [adjustTarget, setAdjustTarget] = useState<PantryIngredient | null>(null)
  const [reorderTarget, setReorderTarget] = useState<PantryIngredient | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.bakery.getPantry()
      setItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryPantryLoadFailed') || 'Failed to load pantry ingredients'))
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculated Metrics
  const summary = useMemo(() => {
    let totalValuation = 0
    let lowCount = 0
    let reorderCount = 0
    let zeroStockCount = 0

    items.forEach(item => {
      totalValuation += (item.currentStock || 0) * (item.costPerUnit || 0)
      if (item.currentStock <= 0) zeroStockCount++
      if (isLowStock(item)) lowCount++
      if (needsReorder(item)) reorderCount++
    })

    return {
      totalValuation,
      totalItems: items.length,
      lowCount,
      reorderCount,
      zeroStockCount,
    }
  }, [items])

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return items.filter(item => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))

      let matchesStatus = true
      if (statusFilter === 'low') matchesStatus = isLowStock(item)
      else if (statusFilter === 'reorder') matchesStatus = needsReorder(item)
      else if (statusFilter === 'healthy') matchesStatus = !isLowStock(item) && !needsReorder(item)

      return matchesSearch && matchesStatus
    })
  }, [items, searchQuery, statusFilter])

  // ── Actions ──
  const handleSaveIngredient = async (form: PantryFormData) => {
    const payload = {
      id: form.id,
      name: form.name.trim(),
      currentStock: Number(form.currentStock) || 0,
      unit: form.unit.trim(),
      costPerUnit: Number(form.costPerUnit) || 0,
      lowStockThreshold: form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : undefined,
      reorderPoint: form.reorderPoint !== '' ? Number(form.reorderPoint) : undefined,
      reorderQuantity: form.reorderQuantity !== '' ? Number(form.reorderQuantity) : undefined,
      supplierName: form.supplierName.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    await window.api.bakery.upsertPantryIngredient(payload)
    showToast('success', form.id ? (t('bakeryIngredientUpdated') || 'Ingredient updated') : (t('bakeryIngredientAdded') || 'New ingredient added'))
    setShowFormModal(false)
    setEditingItem(null)
    loadData()
  }

  const handleAdjustStock = async (
    target: PantryIngredient,
    mode: AdjustStockMode,
    amount: number,
    reason?: string
  ) => {
    let delta: number
    if (mode === 'add') delta = amount
    else if (mode === 'remove') delta = -amount
    else delta = amount - target.currentStock

    await window.api.bakery.adjustPantryStock({
      id: target.id,
      adjustment: delta,
      reason: reason || undefined,
    })

    showToast('success', t('bakeryStockAdjusted') || 'Stock level adjusted successfully')
    setAdjustTarget(null)
    loadData()
  }

  const handleReceiveReorder = async (
    target: PantryIngredient,
    quantityReceived: number,
    purchasePrice?: number
  ) => {
    await window.api.bakery.markPantryReordered({
      id: target.id,
      quantityReceived,
      purchasePrice,
    })

    showToast('success', t('bakeryStockReceived') || 'Stock delivery recorded!')
    setReorderTarget(null)
    loadData()
  }

  const handleBulkRestock = async (bulkItems: BulkRestockItem[]) => {
    const payload = bulkItems
      .filter(i => i.qty !== '' && Number(i.qty) > 0)
      .map(i => ({
        id: i.id,
        quantityReceived: Number(i.qty),
        purchasePrice: i.price !== '' ? Number(i.price) : undefined,
      }))

    await window.api.bakery.bulkRestock(payload)
    showToast('success', t('bakeryBulkRestocked') || 'Bulk restock completed!')
    setShowBulkModal(false)
    loadData()
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.bakery.deletePantryIngredient(id)
      showToast('success', t('bakeryPantryDeleted') || 'Ingredient removed from pantry')
      setDeletingId(null)
      loadData()
    } catch (err: any) {
      showToast('error', err?.message || (t('bakeryPantryDeleteFailed') || 'Failed to delete ingredient'))
    }
  }

  return {
    items: filteredItems,
    allItems: items,
    loading,
    summary,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    // Modals
    showFormModal,
    setShowFormModal,
    editingItem,
    openAdd: () => {
      setEditingItem(null)
      setShowFormModal(true)
    },
    openEdit: (item: PantryIngredient) => {
      setEditingItem(item)
      setShowFormModal(true)
    },
    adjustTarget,
    setAdjustTarget,
    reorderTarget,
    setReorderTarget,
    showBulkModal,
    setShowBulkModal,
    deletingId,
    setDeletingId,
    // Operations
    handleSaveIngredient,
    handleAdjustStock,
    handleReceiveReorder,
    handleBulkRestock,
    handleDelete,
    refresh: loadData,
  }
}