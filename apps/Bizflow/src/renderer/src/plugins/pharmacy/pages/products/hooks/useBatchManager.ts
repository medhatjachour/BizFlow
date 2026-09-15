import { useState, useEffect, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { ProductBatch, PharmacyProductItem } from '../types'

export function useBatchManager(product: PharmacyProductItem, toast: any, t: (k: string, params?: Record<string, any>) => string) {
  const [batches, setBatches] = useState<ProductBatch[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const blankForm = {
    batchNumber: '',
    quantity: '',
    costPerUnit: '',
    sellingPrice: '',
    expiryDate: '',
    supplierId: '',
  }
  const [newBatchForm, setNewBatchForm] = useState(blankForm)

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ costPerUnit: '', sellingPrice: '', expiryDate: '' })
  const [editBusy, setEditBusy] = useState(false)

  const [adj, setAdj] = useState<{
    mode: 'add' | 'remove' | 'set'
    amount: string
    unit: 'base' | 'sub'
    reason: string
  }>({ mode: 'add', amount: '', unit: 'base', reason: '' })
  const [adjBusy, setAdjBusy] = useState(false)

  const loadBatches = useCallback(async () => {
    setLoading(true)
    try {
      const list = (await pharma()?.batches.getByProduct(product.id)) ?? []
      setBatches(list)
    } finally {
      setLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    loadBatches()
    pharma()?.suppliers.getAll().then((res: any) => setSuppliers(res?.data ?? res ?? [])).catch(() => {})
  }, [loadBatches])

  const addBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchForm.quantity || !newBatchForm.expiryDate) {
      toast.error(t('phQtyExpiryRequired'))
      return
    }
    setAdding(true)
    try {
      await pharma()?.batches.add({
        productId: product.id,
        batchNumber: newBatchForm.batchNumber || undefined,
        quantity: parseFloat(newBatchForm.quantity),
        costPerUnit: parseFloat(newBatchForm.costPerUnit) || 0,
        sellingPrice: newBatchForm.sellingPrice ? parseFloat(newBatchForm.sellingPrice) : undefined,
        expiryDate: newBatchForm.expiryDate,
        supplierId: newBatchForm.supplierId || undefined,
      })
      toast.success(t('phBatchAdded'))
      setNewBatchForm(blankForm)
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || t('phInvBatchAddFailed'))
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (batch: ProductBatch) => {
    setEditId(batch.id)
    setEditForm({
      costPerUnit: String(batch.costPerUnit ?? ''),
      sellingPrice: batch.sellingPrice != null ? String(batch.sellingPrice) : '',
      expiryDate: new Date(batch.expiryDate).toISOString().slice(0, 10),
    })
    setAdj({ mode: 'add', amount: '', unit: 'base', reason: '' })
  }

  const saveEdit = async (batchId: string) => {
    setEditBusy(true)
    try {
      await pharma()?.batches.update(batchId, {
        costPerUnit: parseFloat(editForm.costPerUnit) || 0,
        sellingPrice: editForm.sellingPrice ? parseFloat(editForm.sellingPrice) : null,
        expiryDate: editForm.expiryDate,
      })
      toast.success(t('phBatchUpdated'))
      setEditId(null)
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || t('phInvBatchSaveFailed'))
    } finally {
      setEditBusy(false)
    }
  }

  const applyAdjust = async (batchId: string) => {
    const amount = parseFloat(adj.amount)
    if (!Number.isFinite(amount) || amount < 0 || (adj.mode !== 'set' && amount <= 0)) {
      toast.error(t('phEnterAmount'))
      return
    }
    setAdjBusy(true)
    try {
      await pharma()?.batches.adjust(batchId, {
        mode: adj.mode,
        amount,
        unit: adj.unit,
        reason: adj.reason || undefined,
      })
      toast.success(t('phStockAdjusted'))
      setEditId(null)
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || t('phInvAdjustFailed'))
    } finally {
      setAdjBusy(false)
    }
  }

  const disposeBatch = async (batchId: string) => {
    try {
      await pharma()?.batches.dispose(batchId, { reason: 'Disposed via Batch Manager' })
      toast.success(t('phBatchDisposed'))
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || t('phInvDisposeFailed'))
    }
  }

  const deleteBatch = async (batchId: string) => {
    try {
      await pharma()?.batches.delete(batchId)
      toast.success(t('phBatchDeleted'))
      loadBatches()
    } catch (err: any) {
      toast.error(err?.message || t('deleteFailed'))
    }
  }

  return {
    batches,
    suppliers,
    loading,
    adding,
    newBatchForm,
    setNewBatchForm,
    editId,
    setEditId,
    editForm,
    setEditForm,
    editBusy,
    adj,
    setAdj,
    adjBusy,
    addBatch,
    startEdit,
    saveEdit,
    applyAdjust,
    disposeBatch,
    deleteBatch,
  }
}