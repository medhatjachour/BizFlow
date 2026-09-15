import { useState } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacySupplierItem, SupplierFormData } from '../types'
import { initialSupplierFormData } from '../utils'

export function useSupplierForm(
  initial: PharmacySupplierItem | null,
  toast: any,
  t: (k: string, params?: Record<string, any>) => string,
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
      toast.error(t('phSuNameRequired'))
      return
    }

    setBusy(true)
    try {
      if (initial) {
        await pharma()?.suppliers.update(initial.id, form)
        toast.success(t('phSupplierUpdated'))
      } else {
        await pharma()?.suppliers.create(form)
        toast.success(t('phSupplierAdded'))
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || t('phSuSaveFailed'))
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