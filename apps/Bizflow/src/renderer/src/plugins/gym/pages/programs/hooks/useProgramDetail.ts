import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Program, ProgramDay } from '../types'

export function useProgramDetail(
  initialProgram: Program,
  onProgramUpdated: (p: Program) => void
) {
  const toast = useToast()
  const [program, setProgram] = useState<Program>(initialProgram)
  const [loading, setLoading] = useState(false)

  // Sub Modals
  const [editOpen, setEditOpen] = useState(false)
  const [dayFormOpen, setDayFormOpen] = useState(false)
  const [exFormDay, setExFormDay] = useState<ProgramDay | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const reloadProgram = useCallback(async () => {
    setLoading(true)
    try {
      const full = await (window.api as any).gym?.programs?.getById(program.id)
      if (full) {
        setProgram(full)
        onProgramUpdated(full)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load program details')
    } finally {
      setLoading(false)
    }
  }, [program.id, onProgramUpdated, toast])

  useEffect(() => {
    reloadProgram()
  }, [reloadProgram])

  // Fixed IPC invocation for addDay
  const handleAddDay = async (data: { weekNumber: number; dayNumber: number; name?: string }) => {
    try {
      const created = await (window.api as any).gym?.programs?.addDay({
        programId: program.id,
        data: {
          weekNumber: Number(data.weekNumber),
          dayNumber: Number(data.dayNumber),
          name: data.name?.trim() || undefined
        }
      })
      toast.success('Training day added to program')
      setDayFormOpen(false)
      reloadProgram()
      return created
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add day')
    }
  }

  const handleDeleteDay = async (dayId: string) => {
    try {
      await (window.api as any).gym?.programs?.deleteDay(dayId)
      toast.success('Training day removed')
      setProgram(prev => ({
        ...prev,
        days: prev.days?.filter(d => d.id !== dayId)
      }))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete day')
    }
  }

  // Fixed IPC invocation for addExercise
  const handleAddExercise = async (dayId: string, data: any) => {
    try {
      const created = await (window.api as any).gym?.programs?.addExercise({
        dayId,
        data: {
          name: data.name.trim(),
          sets: Number(data.sets) || 3,
          reps: String(data.reps || '10'),
          weight: data.weight?.trim() || undefined,
          restSec: Number(data.restSec) || undefined,
          notes: data.notes?.trim() || undefined
        }
      })
      toast.success('Exercise added')
      setExFormDay(null)
      reloadProgram()
      return created
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add exercise')
    }
  }

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    try {
      await (window.api as any).gym?.programs?.deleteExercise(exerciseId)
      toast.success('Exercise removed')
      setProgram(prev => ({
        ...prev,
        days: prev.days?.map(d =>
          d.id === dayId ? { ...d, exercises: d.exercises?.filter(e => e.id !== exerciseId) } : d
        )
      }))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete exercise')
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