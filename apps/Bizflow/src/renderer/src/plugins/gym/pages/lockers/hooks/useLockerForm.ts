import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Locker, LockerFormData } from '../types'

const defaultForm: LockerFormData = {
  number: '',
  zone: 'general',
  notes: ''
}

export function useLockerForm(
  isOpen: boolean,
  initial: Locker | null,
  onSaved: () => void,
  onClose: () => void
) {
  const toast = useToast()
  const [form, setForm] = useState<LockerFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (initial) {
      setForm({
        number: initial.number,
        zone: initial.zone,
        notes: initial.notes ?? ''
      })
    } else {
      setForm(defaultForm)
    }
  }, [isOpen, initial])

  const setField = (key: keyof LockerFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.number.trim()) {
      toast.error('Locker number is required')
      return
    }

    setSaving(true)
    try {
      if (initial) {
        await (window.api as any).gym?.lockers?.update({
          id: initial.id,
          data: {
            zone: form.zone,
            notes: form.notes.trim() || undefined
          }
        })
        toast.success(`Locker ${initial.number} updated`)
      } else {
        await (window.api as any).gym?.lockers?.create({
          number: form.number.trim(),
          zone: form.zone,
          notes: form.notes.trim() || undefined
        })
        toast.success(`Locker ${form.number} created`)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save locker')
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