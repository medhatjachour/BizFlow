import { useState, useEffect, useCallback } from 'react'
import { Transfer, LocationRef, CreateTransferFormData } from '../types'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function useTransfersData() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [locations, setLocations] = useState<LocationRef[]>([])
  const [loading, setLoading] = useState(true)
  const [actingTransferId, setActingTransferId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()
  const { t } = useLanguage()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [transfersRes, locationsRes] = await Promise.all([
        window.api.warehouse.getTransfers(),
        window.api.warehouse.getLocations()
      ])
      setTransfers(Array.isArray(transfersRes) ? transfersRes : [])
      setLocations(Array.isArray(locationsRes) ? locationsRes : [])
    } catch (err: any) {
      console.error('[useTransfersData] Load error:', err)
      const msg = err?.message || t('warehouseLoadTransfersFailed') || 'Failed to load stock transfers'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createTransfer = async (formData: CreateTransferFormData) => {
    try {
      const cleanItems = formData.items
        .filter(i => i.productName.trim())
        .map(i => ({
          productName: i.productName.trim(),
          sku: i.sku.trim() || undefined,
          quantity: Math.max(1, Number(i.quantity) || 1),
          unit: i.unit.trim() || 'pcs',
          notes: i.notes?.trim() || undefined
        }))

      if (cleanItems.length === 0) {
        toast.warning(t('warehouseAddAtLeastOneItem') || 'Please add at least one line item.')
        return false
      }

      await window.api.warehouse.createTransfer({
        fromLocationId: formData.fromLocationId,
        toLocationId: formData.toLocationId,
        notes: formData.notes.trim() || undefined,
        createdBy: 'warehouse.operator',
        items: cleanItems
      })

      toast.success(t('warehouseTransferCreated') || 'Stock transfer dispatched successfully')
      await loadData()
      return true
    } catch (err: any) {
      toast.error(err?.message || t('warehouseCreateTransferFailed') || 'Creation failed')
      return false
    }
  }

  const updateStatus = async (id: string, targetStatus: string) => {
    setActingTransferId(id)
    const previous = [...transfers]

    // Optimistic Update
    setTransfers(prev =>
      prev.map(tr =>
        tr.id === id
          ? {
              ...tr,
              status: targetStatus,
              completedAt: targetStatus === 'completed' ? new Date().toISOString() : tr.completedAt
            }
          : tr
      )
    )

    try {
      await window.api.warehouse.updateTransferStatus({
        id,
        status: targetStatus,
        actedBy: 'warehouse.operator'
      })
      toast.success(
        (t('warehouseTransferMovedTo') || 'Transfer moved to {status}').replace(
          '{status}',
          targetStatus.replace('_', ' ')
        )
      )
      await loadData()
    } catch (err: any) {
      setTransfers(previous)
      toast.error(err?.message || t('warehouseUpdateTransferFailed') || 'Failed to update transfer status')
    } finally {
      setActingTransferId(null)
    }
  }

  const deleteTransfer = async (id: string) => {
    const previous = [...transfers]
    setTransfers(prev => prev.filter(tr => tr.id !== id))
    try {
      await window.api.warehouse.deleteTransfer(id)
      toast.success(t('warehouseTransferDeleted') || 'Transfer record purged')
    } catch (err: any) {
      setTransfers(previous)
      toast.error(err?.message || t('warehouseDeleteTransferFailed') || 'Failed to delete transfer')
    }
  }

  return {
    transfers,
    locations,
    loading,
    actingTransferId,
    error,
    refresh: loadData,
    createTransfer,
    updateStatus,
    deleteTransfer
  }
}