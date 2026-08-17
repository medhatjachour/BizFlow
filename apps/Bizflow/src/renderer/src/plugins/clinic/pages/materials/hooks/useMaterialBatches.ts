import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Batch, BatchFormData } from '../types'

export function useMaterialBatches(materialId?: string | null) {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadBatches = useCallback(async () => {
    if (!materialId) {
      setBatches([])
      return
    }
    setLoading(true)
    try {
      const list = await window.api.clinic.materialBatches.getByMaterial(materialId)
      setBatches(list ?? [])
    } catch {
      showToast('error', t('errorLoadingData') || 'Failed to load batches')
    } finally {
      setLoading(false)
    }
  }, [materialId, showToast, t])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  const createBatch = async (values: BatchFormData) => {
    if (!materialId) return
    setSaving(true)
    try {
      await window.api.clinic.materialBatches.create(materialId, {
        batchNumber: values.batchNumber.trim() || undefined,
        quantity: parseFloat(values.quantity) || 0,
        expiryDate: values.expiryDate || undefined,
        costPerUnit: values.costPerUnit ? parseFloat(values.costPerUnit) : undefined,
        supplier: values.supplier.trim() || undefined,
        notes: values.notes.trim() || undefined
      })
      showToast('success', t('createdSuccessfully') || 'Batch added')
      await loadBatches()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Failed to save batch')
    } finally {
      setSaving(false)
    }
  }

  const updateBatch = async (batchId: string, values: BatchFormData) => {
    setSaving(true)
    try {
      await window.api.clinic.materialBatches.update(batchId, {
        batchNumber: values.batchNumber.trim() || undefined,
        quantity: parseFloat(values.quantity) || 0,
        expiryDate: values.expiryDate || undefined,
        costPerUnit: values.costPerUnit ? parseFloat(values.costPerUnit) : undefined,
        supplier: values.supplier.trim() || undefined,
        notes: values.notes.trim() || undefined,
        isActive: values.isActive
      })
      showToast('success', t('updatedSuccessfully') || 'Batch updated')
      await loadBatches()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Failed to update batch')
    } finally {
      setSaving(false)
    }
  }

  const deleteBatch = async (batchId: string) => {
    if (!window.confirm(t('confirmDelete') || 'Delete batch?')) return
    try {
      await window.api.clinic.materialBatches.delete(batchId)
      showToast('success', t('deletedSuccessfully') || 'Batch removed')
      await loadBatches()
    } catch (err: any) {
      if (err?.message?.includes('BATCH_IN_USE')) {
        showToast('error', 'Batch is used in patient records and cannot be deleted.')
      } else {
        showToast('error', t('errorDeletingRecord') || 'Failed to delete batch')
      }
    }
  }

  return {
    batches,
    loading,
    saving,
    createBatch,
    updateBatch,
    deleteBatch,
    reload: loadBatches
  }
}