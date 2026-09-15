import { useState } from 'react'
import { pharma } from '../../components/_shared'
import { ExpiringBatchItem, DisposalReason } from '../types'

export function useInventoryDisposal(toast: any, t: (k: string, params?: Record<string, any>) => string, onSuccess: () => void) {
  const [targetBatch, setTargetBatch] = useState<ExpiringBatchItem | null>(null)
  const [reason, setReason] = useState<DisposalReason>('Expired')
  const [customNotes, setCustomNotes] = useState('')
  const [disposeQty, setDisposeQty] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const openDisposal = (batch: ExpiringBatchItem) => {
    setTargetBatch(batch)
    setReason(batch.isExpired ? 'Expired' : 'Damaged / Broken')
    setDisposeQty(String(batch.quantity))
    setCustomNotes('')
  }

  const closeDisposal = () => {
    setTargetBatch(null)
    setCustomNotes('')
    setDisposeQty('')
  }

  const executeDisposal = async () => {
    if (!targetBatch) return
    const qty = parseFloat(disposeQty)
    if (!qty || qty <= 0 || qty > targetBatch.quantity) {
      toast.error(t('phInvInvalidQty'))
      return
    }

    setBusy(true)
    try {
      const fullReason = customNotes.trim() ? `${reason} - ${customNotes.trim()}` : reason
      await pharma()?.batches.dispose(targetBatch.id, {
        quantity: qty,
        reason: fullReason,
      })
      toast.success(t('phBatchDisposed'))
      closeDisposal()
      onSuccess()
    } catch (err: any) {
      toast.error(err?.message || t('phInvDisposalFailed'))
    } finally {
      setBusy(false)
    }
  }

  return {
    targetBatch,
    reason,
    customNotes,
    disposeQty,
    busy,
    setReason,
    setCustomNotes,
    setDisposeQty,
    openDisposal,
    closeDisposal,
    executeDisposal,
  }
}