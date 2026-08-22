import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Trainee, Measurement, TraineeGoal, ProfileTab, MeasurementFormData, GoalFormData } from '../types'

const defaultMeasForm: MeasurementFormData = {
  date: new Date().toISOString().slice(0, 10),
  weight: '',
  bodyFat: '',
  muscle: '',
  waist: '',
  chest: '',
  arms: '',
  legs: '',
  notes: ''
}

const defaultGoalForm: GoalFormData = {
  title: '',
  type: 'weight',
  targetValue: '',
  unit: 'kg',
  deadline: '',
  notes: ''
}

export function useTraineeProfile(initialTrainee: Trainee, onEdited: (t: Trainee) => void) {
  const toast = useToast()
  const [tab, setTab] = useState<ProfileTab>('info')
  const [trainee, setTrainee] = useState<Trainee>(initialTrainee)
  const [fullData, setFullData] = useState<Trainee | null>(null)
  const [loadingFull, setLoadingFull] = useState(false)

  // Sub-modals
  const [editOpen, setEditOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  // Measurements
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [measForm, setMeasForm] = useState<MeasurementFormData>(defaultMeasForm)
  const [savingMeas, setSavingMeas] = useState(false)

  // Goals
  const [goals, setGoals] = useState<TraineeGoal[]>([])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState<GoalFormData>(defaultGoalForm)
  const [savingGoal, setSavingGoal] = useState(false)

  const loadFullProfile = useCallback(async () => {
    setLoadingFull(true)
    try {
      const data = await (window.api as any).gym?.trainees?.getById(trainee.id)
      setFullData(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load details')
    } finally {
      setLoadingFull(false)
    }
  }, [trainee.id, toast])

  useEffect(() => {
    loadFullProfile()
  }, [loadFullProfile])

  useEffect(() => {
    ;(window.api as any).gym?.measurements?.getAll(trainee.id).then(setMeasurements).catch(() => {})
    ;(window.api as any).gym?.goals?.getAll(trainee.id).then(setGoals).catch(() => {})
  }, [trainee.id])

  const handleEdited = (updated: Trainee) => {
    setTrainee(updated)
    onEdited(updated)
    setEditOpen(false)
    loadFullProfile()
  }

  // Measurement Actions
  const saveMeasurement = async () => {
    setSavingMeas(true)
    try {
      const payload: any = { traineeId: trainee.id, date: measForm.date }
      const numericKeys: (keyof MeasurementFormData)[] = ['weight', 'bodyFat', 'muscle', 'waist', 'chest', 'arms', 'legs']
      numericKeys.forEach(k => {
        if (measForm[k] !== '') payload[k] = parseFloat(measForm[k])
      })
      if (measForm.notes) payload.notes = measForm.notes

      const created = await (window.api as any).gym?.measurements?.create(payload)
      setMeasurements(prev => [created, ...prev])
      setShowMeasForm(false)
      setMeasForm(defaultMeasForm)
      toast.success('Body measurement recorded')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save measurement')
    } finally {
      setSavingMeas(false)
    }
  }

  const deleteMeasurement = async (id: string) => {
    try {
      await (window.api as any).gym?.measurements?.delete(id)
      setMeasurements(prev => prev.filter(m => m.id !== id))
      toast.success('Measurement deleted')
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed')
    }
  }

  // Goal Actions
  const saveGoal = async () => {
    setSavingGoal(true)
    try {
      const payload: any = {
        traineeId: trainee.id,
        title: goalForm.title,
        type: goalForm.type,
        notes: goalForm.notes,
        status: 'active'
      }
      if (goalForm.targetValue !== '') payload.targetValue = parseFloat(goalForm.targetValue)
      if (goalForm.unit) payload.unit = goalForm.unit
      if (goalForm.deadline) payload.deadline = goalForm.deadline

      const created = await (window.api as any).gym?.goals?.create(payload)
      setGoals(prev => [created, ...prev])
      setShowGoalForm(false)
      setGoalForm(defaultGoalForm)
      toast.success('Goal added')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add goal')
    } finally {
      setSavingGoal(false)
    }
  }

  const markGoalAchieved = async (id: string) => {
    try {
      const updated = await (window.api as any).gym?.goals?.markAchieved(id)
      setGoals(prev => prev.map(g => (g.id === id ? updated : g)))
      toast.success('Goal achieved! 🎯')
    } catch (e: any) {
      toast.error(e.message ?? 'Action failed')
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      await (window.api as any).gym?.goals?.delete(id)
      setGoals(prev => prev.filter(g => g.id !== id))
      toast.success('Goal removed')
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed')
    }
  }

  return {
    tab,
    setTab,
    trainee,
    fullData,
    loadingFull,
    editOpen,
    setEditOpen,
    qrOpen,
    setQrOpen,
    handleEdited,
    // Measurements
    measurements,
    showMeasForm,
    setShowMeasForm,
    measForm,
    setMeasForm,
    savingMeas,
    saveMeasurement,
    deleteMeasurement,
    // Goals
    goals,
    showGoalForm,
    setShowGoalForm,
    goalForm,
    setGoalForm,
    savingGoal,
    saveGoal,
    markGoalAchieved,
    deleteGoal
  }
}