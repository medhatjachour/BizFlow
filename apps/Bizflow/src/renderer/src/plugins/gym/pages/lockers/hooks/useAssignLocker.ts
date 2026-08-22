import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Locker, TraineeLite, AssignLockerFormData } from '../types'

const defaultForm: AssignLockerFormData = {
  memberSearch: '',
  traineeId: '',
  selectedMember: null,
  endDate: '',
  notes: ''
}

export function useAssignLocker(
  locker: Locker | null,
  isOpen: boolean,
  onSaved: () => void,
  onClose: () => void
) {
  const toast = useToast()
  const [form, setForm] = useState<AssignLockerFormData>(defaultForm)
  const [results, setResults] = useState<TraineeLite[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(defaultForm)
    setResults([])
  }, [isOpen])

  const searchMembers = async (query: string) => {
    setForm(prev => ({ ...prev, memberSearch: query, traineeId: '', selectedMember: null }))
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    setSearching(true)
    try {
      const res = await (window.api as any).gym?.trainees?.searchLite(query)
      setResults(Array.isArray(res) ? res : [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectMember = (member: TraineeLite) => {
    setForm(prev => ({
      ...prev,
      memberSearch: member.name,
      traineeId: member.id,
      selectedMember: member
    }))
    setResults([])
  }

  const clearMember = () => {
    setForm(prev => ({ ...prev, memberSearch: '', traineeId: '', selectedMember: null }))
    setResults([])
  }

  const setQuickEndDate = (monthsToAdd: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + monthsToAdd)
    setForm(prev => ({ ...prev, endDate: d.toISOString().slice(0, 10) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locker || !form.selectedMember) {
      toast.error('Please choose a member to assign')
      return
    }

    setSaving(true)
    try {
      await (window.api as any).gym?.lockers?.assign({
        lockerId: locker.id,
        traineeId: form.selectedMember.id,
        endDate: form.endDate || undefined,
        notes: form.notes.trim() || undefined
      })
      toast.success(`Locker ${locker.number} assigned to ${form.selectedMember.name}`)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to assign locker')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    results,
    searching,
    saving,
    searchMembers,
    selectMember,
    clearMember,
    setQuickEndDate,
    handleSubmit
  }
}