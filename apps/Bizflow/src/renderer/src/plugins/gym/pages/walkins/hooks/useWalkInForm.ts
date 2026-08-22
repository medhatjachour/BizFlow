import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { WalkInFormData, CoachSummary, TraineeSummary } from '../types'

const defaultForm = (): WalkInFormData => ({
  traineeSearch: '',
  traineeId: '',
  coachId: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'walkin',
  amount: '',
  paymentMethod: 'cash',
  notes: ''
})

export function useWalkInForm(isOpen: boolean, onSaved: () => void, onClose: () => void) {
  const toast = useToast()
  const [form, setForm] = useState<WalkInFormData>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [coaches, setCoaches] = useState<CoachSummary[]>([])
  const [traineeResults, setTraineeResults] = useState<TraineeSummary[]>([])
  const [searchingTrainee, setSearchingTrainee] = useState(false)
  const [showTraineeDropdown, setShowTraineeDropdown] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(defaultForm())
    ;(window.api as any).gym?.coaches?.getAll({ take: 100 })
      .then((res: any) => setCoaches(Array.isArray(res) ? res : res?.data ?? []))
      .catch(() => setCoaches([]))
  }, [isOpen])

  const searchTrainees = async (query: string) => {
    setForm(prev => ({ ...prev, traineeSearch: query, traineeId: '' }))
    if (!query.trim()) {
      setTraineeResults([])
      setShowTraineeDropdown(false)
      return
    }
    setSearchingTrainee(true)
    try {
      const res = await (window.api as any).gym?.trainees?.searchLite(query)
      setTraineeResults(Array.isArray(res) ? res : [])
      setShowTraineeDropdown(true)
    } catch {
      setTraineeResults([])
    } finally {
      setSearchingTrainee(false)
    }
  }

  const selectTrainee = (trainee: TraineeSummary) => {
    setForm(prev => ({
      ...prev,
      traineeId: trainee.id,
      traineeSearch: trainee.name
    }))
    setTraineeResults([])
    setShowTraineeDropdown(false)
  }

  const clearSelectedTrainee = () => {
    setForm(prev => ({ ...prev, traineeId: '', traineeSearch: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.type === 'walkin' && (!form.amount || parseFloat(form.amount) <= 0)) {
      toast.error('Walk-in sessions require a valid entry fee greater than $0')
      return
    }

    setSaving(true)
    try {
      const payload = {
        traineeId: form.traineeId || null,
        coachId: form.coachId || null,
        date: form.date,
        type: form.type,
        amount: form.amount ? parseFloat(form.amount) : 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || null
      }

      await (window.api as any).gym?.sessions?.create(payload)
      toast.success('Session recorded successfully')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to log session')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    saving,
    coaches,
    traineeResults,
    searchingTrainee,
    showTraineeDropdown,
    setShowTraineeDropdown,
    searchTrainees,
    selectTrainee,
    clearSelectedTrainee,
    handleSubmit
  }
}