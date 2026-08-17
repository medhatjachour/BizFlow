import { useState, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Expense, ExpenseFormData } from '../types'

export function useExpenseForm(existing?: Expense | null, onSaved?: () => void) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const todayIso = new Date().toISOString().slice(0, 10)

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ExpenseFormData>({
    date: existing ? new Date(existing.date).toISOString().slice(0, 10) : todayIso,
    category: existing?.category ?? 'medical_supplies',
    description: existing?.description ?? '',
    amount: existing?.amount != null ? String(existing.amount) : '',
    vendor: existing?.vendor ?? '',
    paymentMethod: existing?.paymentMethod ?? 'cash',
    recurrence: existing?.recurrence ?? 'one_time',
    notes: existing?.notes ?? ''
  })

  useEffect(() => {
    if (existing) {
      setForm({
        date: new Date(existing.date).toISOString().slice(0, 10),
        category: existing.category ?? 'medical_supplies',
        description: existing.description ?? '',
        amount: existing.amount != null ? String(existing.amount) : '',
        vendor: existing.vendor ?? '',
        paymentMethod: existing.paymentMethod ?? 'cash',
        recurrence: existing.recurrence ?? 'one_time',
        notes: existing.notes ?? ''
      })
    }
  }, [existing])

  const setField = <K extends keyof ExpenseFormData>(key: K, value: ExpenseFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!form.description.trim()) {
      showToast('error', t('expenseDescRequired') || 'Description is required')
      return
    }

    const parsedAmount = parseFloat(form.amount)
    if (!parsedAmount || parsedAmount <= 0 || !Number.isFinite(parsedAmount)) {
      showToast('error', t('expenseAmountRequired') || 'Please provide a valid expense amount')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: parsedAmount,
        date: new Date(form.date).toISOString(),
        vendor: form.vendor.trim() || null,
        notes: form.notes.trim() || null
      }

      if (existing?.id) {
        await window.api.clinic.expenses.update(existing.id, payload)
        showToast('success', t('updatedSuccessfully') || 'Expense updated successfully')
      } else {
        await window.api.clinic.expenses.create(payload)
        showToast('success', t('createdSuccessfully') || 'Expense created successfully')
      }

      if (onSaved) onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error saving expense record')
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