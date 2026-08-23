import { useState } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacySupplierItem, SupplierFormData } from '../types'
import { initialSupplierFormData } from '../utils'

export function useSupplierForm(
  initial: PharmacySupplierItem | null,
  toast: any,
  t: (k: string) => string,
  onSaved: () => void
) {
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<SupplierFormData>(() => initialSupplierFormData(initial))

  const setField = (key: keyof SupplierFormData) => (e: any) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    setBusy(true)
    try {
      if (initial) {
        await pharma()?.suppliers.update(initial.id, form)
        toast.success(t('phSupplierUpdated') || 'Supplier updated')
      } else {
        await pharma()?.suppliers.create(form)
        toast.success(t('phSupplierAdded') || 'Supplier added')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save supplier')
    } finally {
      setBusy(false)
    }
  }

  return {
    form,
    busy,
    setField,
    submit,
  }
}