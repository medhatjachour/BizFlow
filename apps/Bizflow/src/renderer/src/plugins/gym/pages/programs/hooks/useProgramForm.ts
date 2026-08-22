import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Program, ProgramFormData } from '../types'

const defaultForm: ProgramFormData = {
  name: '',
  description: '',
  goal: 'general fitness',
  weeksTotal: 4,
  daysPerWeek: 3,
  coachId: '',
  isActive: true
}

export function useProgramForm(
  isOpen: boolean,
  initial: Program | null,
  onSaved: (program: Program) => void,
  onClose: () => void
) {
  const toast = useToast()
  const [form, setForm] = useState<ProgramFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        name: initial.name,
        description: initial.description ?? '',
        goal: initial.goal,
        weeksTotal: initial.weeksTotal || 4,
        daysPerWeek: initial.daysPerWeek || 3,
        coachId: initial.coachId ?? initial.coach?.id ?? '',
        isActive: initial.isActive !== false
      })
    } else {
      setForm(defaultForm)
    }
  }, [isOpen, initial])

  const setField = (key: keyof ProgramFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Program name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        goal: form.goal,
        weeksTotal: Number(form.weeksTotal) || 4,
        daysPerWeek: Number(form.daysPerWeek) || 3,
        coachId: form.coachId || undefined,
        isActive: form.isActive
      }

      let result: Program
      if (initial) {
        result = await (window.api as any).gym?.programs?.update({
          id: initial.id,
          data: payload
        })
        toast.success('Program updated')
      } else {
        result = await (window.api as any).gym?.programs?.create(payload)
        toast.success('New program published')
      }
      onSaved(result)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save program')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setField,
    saving,
    handleSubmit
  }
}