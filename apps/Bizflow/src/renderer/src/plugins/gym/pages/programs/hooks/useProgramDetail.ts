import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Program, ProgramDay, DayFormData, ExerciseFormData } from '../types'

export function useProgramDetail(
  initialProgram: Program,
) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [program, setProgram] = useState<Program>(initialProgram)
  const [loading, setLoading] = useState(false)

  // Sub Modals
  const [editOpen, setEditOpen] = useState(false)
  const [dayFormOpen, setDayFormOpen] = useState(false)
  const [exFormDay, setExFormDay] = useState<ProgramDay | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const programId = initialProgram?.id

  // 1. Fetch full program details (days + exercises)
  const reloadProgram = useCallback(async () => {
    if (!programId) return
    setLoading(true)
    try {
      const full = await (window.api as any).gym?.programs?.getById(programId)
      if (full) {
        setProgram(full)
        // Automatically expand all days on initial load
        setExpandedDays(prev => {
          const map: Record<string, boolean> = { ...prev }
          full.days?.forEach((d: ProgramDay) => {
            if (map[d.id] === undefined) map[d.id] = true
          })
          return map
        })
      }
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to load program details')
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    reloadProgram()
  }, [reloadProgram])

  // 2. Add Day (Passes 2 separate arguments: programId, dayPayload)
  const handleAddDay = async (data: DayFormData) => {
    if (!programId) return
    try {
      const dayPayload = {
        weekNumber: Number(data.weekNumber) || 1,
        dayNumber: Number(data.dayNumber) || 1,
        name: data.name?.trim() || undefined
      }

      const api = (window.api as any).gym?.programs
      const created = await api.addDay(programId, dayPayload)

      toastRef.current.success('Training day added')
      setDayFormOpen(false)
      await reloadProgram()
      return created
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to add day')
    }
  }

  // 3. Delete Day
  const handleDeleteDay = async (dayId: string) => {
    try {
      await (window.api as any).gym?.programs?.deleteDay(dayId)
      toastRef.current.success('Training day removed')
      setProgram(prev => ({
        ...prev,
        days: prev.days?.filter(d => d.id !== dayId)
      }))
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to delete day')
    }
  }

  // 4. Add Exercise (Passes 2 separate arguments: dayId, exercisePayload)
  const handleAddExercise = async (dayId: string, data: ExerciseFormData) => {
    try {
      const exercisePayload = {
        name: data.name.trim(),
        sets: Number(data.sets) || 3,
        reps: String(data.reps || '10'),
        weight: data.weight?.trim() || undefined,
        restSec: data.restSec ? Number(data.restSec) : undefined,
        notes: data.notes?.trim() || undefined
      }

      const api = (window.api as any).gym?.programs

      // ✅ Direct 2-argument call
      const created = await api.addExercise(dayId, exercisePayload)

      toastRef.current.success('Exercise added')
      setExFormDay(null)
      await reloadProgram()
      return created
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to add exercise')
    }
  }

  // 5. Delete Exercise
  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    try {
      await (window.api as any).gym?.programs?.deleteExercise(exerciseId)
      toastRef.current.success('Exercise removed')
      setProgram(prev => ({
        ...prev,
        days: prev.days?.map(d =>
          d.id === dayId ? { ...d, exercises: d.exercises?.filter(e => e.id !== exerciseId) } : d
        )
      }))
    } catch (err: any) {
      toastRef.current.error(err.message ?? 'Failed to delete exercise')
    }
  }

  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }))
  }

  return {
    program,
    loading,
    editOpen,
    setEditOpen,
    dayFormOpen,
    setDayFormOpen,
    exFormDay,
    setExFormDay,
    assignOpen,
    setAssignOpen,
    expandedDays,
    toggleDayExpansion,
    handleAddDay,
    handleDeleteDay,
    handleAddExercise,
    handleDeleteExercise,
    reloadProgram
  }
}