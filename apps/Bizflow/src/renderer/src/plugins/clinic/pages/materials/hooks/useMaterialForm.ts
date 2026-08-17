import { useState, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Material, MaterialFormData } from '../types'

export function useMaterialForm(existing?: Material | null, onSaved?: () => void) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<MaterialFormData>({
    name: existing?.name ?? '',
    category: existing?.category ?? '',
    description: existing?.description ?? '',
    unit: existing?.unit ?? 'piece',
    quantity: existing?.quantity != null ? String(existing.quantity) : '0',
    minQuantity: existing?.minQuantity != null ? String(existing.minQuantity) : '0',
    costPerUnit: existing?.costPerUnit != null ? String(existing.costPerUnit) : '0',
    supplier: existing?.supplier ?? '',
    notes: existing?.notes ?? '',
    isActive: existing?.isActive ?? true
  })

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? '',
        category: existing.category ?? '',
        description: existing.description ?? '',
        unit: existing.unit ?? 'piece',
        quantity: existing.quantity != null ? String(existing.quantity) : '0',
        minQuantity: existing.minQuantity != null ? String(existing.minQuantity) : '0',
        costPerUnit: existing.costPerUnit != null ? String(existing.costPerUnit) : '0',
        supplier: existing.supplier ?? '',
        notes: existing.notes ?? '',
        isActive: existing.isActive ?? true
      })
    }
  }, [existing])

  const setField = <K extends keyof MaterialFormData>(key: K, value: MaterialFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.name.trim()) {
      showToast('error', t('materialNameRequired') || 'Material name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        description: form.description.trim() || null,
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        minQuantity: parseFloat(form.minQuantity) || 0,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        supplier: form.supplier.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive
      }

      if (existing?.id) {
        await window.api.clinic.materials.update(existing.id, payload)
        showToast('success', t('updatedSuccessfully') || 'Material updated')
      } else {
        await window.api.clinic.materials.create(payload)
        showToast('success', t('createdSuccessfully') || 'Material created')
      }

      if (onSaved) onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error saving material')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    saving,
    setField,
    save
  }
}