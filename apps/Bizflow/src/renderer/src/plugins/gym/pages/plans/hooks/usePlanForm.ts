import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Plan, PlanFormData, FormSection } from '../types'
import { getDefaultPlanForm, mapPlanToForm, buildPlanPayload } from '../utils'

export function usePlanForm(
  isOpen: boolean,
  initial: Plan | null,
  onSaved: (plan: Plan) => void,
  onClose: () => void
) {
  const toast = useToast()
  const [form, setForm] = useState<PlanFormData>(getDefaultPlanForm())
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<FormSection>('basic')

  useEffect(() => {
    if (!isOpen) return
    setSection('basic')
    setForm(initial ? mapPlanToForm(initial) : getDefaultPlanForm())
  }, [isOpen, initial])

  const updateField = (key: keyof PlanFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleInputChange = (key: keyof PlanFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    updateField(key, e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim() || !form.price) {
      setSection('basic')
      toast.error('Plan Name and Price are required')
      return
    }

    setSaving(true)
    try {
      const payload = buildPlanPayload(form)
      let result: Plan
      if (initial) {
        result = await (window.api as any).gym?.plans?.update(initial.id, payload)
        toast.success('Membership plan updated')
      } else {
        result = await (window.api as any).gym?.plans?.create(payload)
        toast.success('New membership plan created')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    saving,
    section,
    setSection,
    updateField,
    handleInputChange,
    handleSubmit
  }
}