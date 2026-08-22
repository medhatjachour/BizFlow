import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Program, TraineeLite, AssignProgramFormData } from '../types'

const defaultForm = (): AssignProgramFormData => ({
  memberSearch: '',
  traineeId: '',
  selectedMember: null,
  startDate: new Date().toISOString().slice(0, 10),
  notes: ''
})

export function useAssignProgram(
  program: Program,
  isOpen: boolean,
  onSaved: () => void,
  onClose: () => void
) {
  const toast = useToast()
  const [form, setForm] = useState<AssignProgramFormData>(defaultForm())
  const [results, setResults] = useState<TraineeLite[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(defaultForm())
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.selectedMember) {
      toast.error('Please select a member to assign')
      return
    }

    setSaving(true)
    try {
      await (window.api as any).gym?.programs?.assign({
        programId: program.id,
        traineeId: form.selectedMember.id,
        startDate: form.startDate || undefined,
        notes: form.notes.trim() || undefined
      })
      toast.success(`"${program.name}" assigned to ${form.selectedMember.name}`)
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to assign program')
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
    handleSubmit
  }
}