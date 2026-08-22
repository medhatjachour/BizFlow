import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { CoachShift, ShiftFormData } from '../types'
import { getWeekRange } from '../utils'

const defaultShiftForm: ShiftFormData = {
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '17:00',
  notes: ''
}

export function useCoachShifts(coachId: string) {
  const toast = useToast()
  const [shifts, setShifts] = useState<CoachShift[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [shiftForm, setShiftForm] = useState<ShiftFormData>(defaultShiftForm)
  const [savingShift, setSavingShift] = useState(false)

  const weekInfo = getWeekRange(weekOffset)

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true)
    try {
      const data = await (window.api as any).gym?.shifts?.getAll({
        coachId,
        weekStart: weekInfo.start.toISOString()
      })
      setShifts(Array.isArray(data) ? data : [])
    } catch {
      setShifts([])
    } finally {
      setLoadingShifts(false)
    }
  }, [coachId, weekInfo.start])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const saveShift = async () => {
    setSavingShift(true)
    try {
      const created = await (window.api as any).gym?.shifts?.create({
        coachId,
        date: shiftForm.date,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        notes: shiftForm.notes.trim() || undefined
      })
      setShifts(prev => [...prev, created])
      setShowShiftForm(false)
      setShiftForm(defaultShiftForm)
      toast.success('Shift assigned')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to assign shift')
    } finally {
      setSavingShift(false)
    }
  }

  const deleteShift = async (id: string) => {
    try {
      await (window.api as any).gym?.shifts?.delete(id)
      setShifts(prev => prev.filter(s => s.id !== id))
      toast.success('Shift removed')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove shift')
    }
  }

  return {
    shifts,
    weekOffset,
    setWeekOffset,
    weekInfo,
    loadingShifts,
    showShiftForm,
    setShowShiftForm,
    shiftForm,
    setShiftForm,
    savingShift,
    saveShift,
    deleteShift
  }
}