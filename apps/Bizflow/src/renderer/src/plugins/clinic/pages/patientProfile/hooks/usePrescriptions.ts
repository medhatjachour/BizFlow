import { useState } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Prescription, PrescriptionDraft } from '../types'

const INITIAL_DRAFT: PrescriptionDraft = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: ''
}

export function usePrescriptions(onPrescriptionsChanged: () => Promise<void>) {
  const { showToast } = useToast()
  const [editingRxId, setEditingRxId] = useState<string | null>(null)
  const [savingRxId, setSavingRxId] = useState<string | null>(null)
  const [rxDraft, setRxDraft] = useState<PrescriptionDraft>(INITIAL_DRAFT)

  const startEdit = (rx: Prescription) => {
    if (!(rx.isActive ?? true)) {
      showToast('error', 'Enable prescription before editing')
      return
    }
    setEditingRxId(rx.id ?? '')
    setRxDraft({
      medicineName: String(rx.medicineName ?? ''),
      dosage: String(rx.dosage ?? ''),
      frequency: String(rx.frequency ?? ''),
      duration: String(rx.duration ?? ''),
      quantity: rx.quantity == null ? '' : String(rx.quantity),
      instructions: String(rx.instructions ?? '')
    })
  }

  const cancelEdit = () => {
    setEditingRxId(null)
    setRxDraft(INITIAL_DRAFT)
  }

  const updatePrescription = async (rxId: string) => {
    if (!rxDraft.medicineName.trim()) {
      showToast('error', 'Medicine name is required')
      return
    }

    const qtyRaw = rxDraft.quantity.trim()
    const parsedQty = qtyRaw === '' ? null : Number(qtyRaw)
    if (qtyRaw !== '' && (parsedQty === null || !Number.isFinite(parsedQty) || parsedQty < 0)) {
      showToast('error', 'Quantity must be a valid positive number')
      return
    }

    setSavingRxId(rxId)
    try {
      await window.api.clinic.prescriptions.update(rxId, {
        medicineName: rxDraft.medicineName.trim(),
        dosage: rxDraft.dosage.trim() || null,
        frequency: rxDraft.frequency.trim() || null,
        duration: rxDraft.duration.trim() || null,
        quantity: parsedQty == null ? null : Math.round(parsedQty),
        instructions: rxDraft.instructions.trim() || null
      })
      showToast('success', 'Prescription updated')
      cancelEdit()
      await onPrescriptionsChanged()
    } catch {
      showToast('error', 'Failed to update prescription')
    } finally {
      setSavingRxId(null)
    }
  }

  const togglePrescriptionStatus = async (rx: Prescription) => {
    const nextStatus = !(rx.isActive ?? true)
    setSavingRxId(rx.id ?? '')
    try {
      await window.api.clinic.prescriptions.setActive(rx.id ?? '', nextStatus)
      showToast('success', nextStatus ? 'Prescription enabled' : 'Prescription disabled')
      if (editingRxId === rx.id) cancelEdit()
      await onPrescriptionsChanged()
    } catch {
      showToast('error', 'Failed to update prescription status')
    } finally {
      setSavingRxId(null)
    }
  }

  return {
    editingRxId,
    savingRxId,
    rxDraft,
    setRxDraft,
    startEdit,
    cancelEdit,
    updatePrescription,
    togglePrescriptionStatus
  }
}