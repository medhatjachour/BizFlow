import { useState, useEffect, useCallback } from 'react'
import { StockEntry, LocationRef, StockUpsertFormData } from '../types'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function useInventoryData() {
  const [locations, setLocations] = useState<LocationRef[]>([])
  const [stockList, setStockList] = useState<StockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()
  const { t } = useLanguage()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [locsRes, stockRes] = await Promise.all([
        window.api.warehouse.getLocations(),
        window.api.warehouse.getStock() // fetch all global stock entries
      ])
      setLocations(Array.isArray(locsRes) ? locsRes : [])
      setStockList(Array.isArray(stockRes) ? stockRes : [])
    } catch (err: any) {
      console.error('[useInventoryData] Load error:', err)
      const msg = err?.message || t('warehouseLoadStockFailed') || 'Failed to load stock data'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const adjustStockQuantity = async (entry: StockEntry, delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta)
    const backupQty = entry.quantity

    // Optimistic UI update
    setStockList(prev => prev.map(s => (s.id === entry.id ? { ...s, quantity: newQty } : s)))

    try {
      await window.api.warehouse.adjustStock({
        id: entry.id,
        quantity: newQty,
        actedBy: 'warehouse.operator',
        reason: delta > 0 ? 'Quick Increment (+)' : 'Quick Decrement (-)'
      })
      toast.success(t('warehouseQuantityUpdated') || 'Stock adjusted')
    } catch (err: any) {
      // Revert on error
      setStockList(prev => prev.map(s => (s.id === entry.id ? { ...s, quantity: backupQty } : s)))
      toast.error(err?.message || t('warehouseUpdateQuantityFailed') || 'Adjustment failed')
    }
  }

  const customAdjust = async (id: string, newQty: number, reason: string) => {
    try {
      await window.api.warehouse.adjustStock({
        id,
        quantity: newQty,
        actedBy: 'warehouse.operator',
        reason
      })
      toast.success(t('warehouseStockUpdated') || 'Stock successfully updated')
      await loadData()
      return true
    } catch (err: any) {
      toast.error(err?.message || 'Failed to adjust stock')
      return false
    }
  }

  const upsertStock = async (data: StockUpsertFormData) => {
    try {
      await window.api.warehouse.upsertStock({
        locationId: data.locationId,
        productName: data.productName.trim(),
        sku: data.sku.trim() || undefined,
        barcode: data.barcode.trim() || undefined,
        quantity: Number(data.quantity) || 0,
        unit: data.unit.trim() || 'pcs',
        minQuantity: Number(data.minQuantity) || 0,
        itemType: data.itemType,
        lotNumber: data.lotNumber.trim() || undefined,
        batchNumber: data.batchNumber.trim() || undefined,
        serialNumber: data.serialNumber.trim() || undefined,
        expiryDate: data.expiryDate ? data.expiryDate : undefined,
        binCode: data.binCode.trim() || undefined,
        aisleCode: data.aisleCode.trim() || undefined,
        shelfCode: data.shelfCode.trim() || undefined,
        isQuarantine: data.isQuarantine,
        isDamaged: data.isDamaged,
        notes: data.notes.trim() || undefined,
        actedBy: 'warehouse.operator'
      })
      toast.success(t('warehouseStockEntryCreated') || 'Stock entry saved')
      await loadData()
      return true
    } catch (err: any) {
      toast.error(err?.message || t('warehouseAddStockFailed') || 'Could not save stock')
      return false
    }
  }

  const deleteStockEntry = async (id: string) => {
    const backup = [...stockList]
    setStockList(prev => prev.filter(s => s.id !== id))
    try {
      await window.api.warehouse.deleteStock(id, 'warehouse.operator')
      toast.success(t('warehouseStockDeleted') || 'Item deleted')
    } catch (err: any) {
      setStockList(backup)
      toast.error(err?.message || t('warehouseDeleteStockFailed') || 'Deletion failed')
    }
  }

  return {
    locations,
    stockList,
    loading,
    error,
    refresh: loadData,
    adjustStockQuantity,
    customAdjust,
    upsertStock,
    deleteStockEntry
  }
}