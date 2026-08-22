import { useState, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Plan, Coach, TraineeLite, SubscriptionFormData, Subscription } from '../types'
import { calculateEndDateFromPlan } from '../utils'

const defaultForm = (): SubscriptionFormData => ({
  traineeSearch: '',
  traineeId: '',
  traineeName: '',
  planId: '',
  coachId: '',
  startDate: new Date().toISOString().slice(0, 10),
  amountPaid: '',
  paymentMethod: 'cash',
  notes: ''
})

export function useSubscriptionForm(
  isOpen: boolean,
  onSaved: () => void,
  onClose: () => void,
  renewTarget?: Subscription | null
) {
  const toast = useToast()
  const [form, setForm] = useState<SubscriptionFormData>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [traineeResults, setTraineeResults] = useState<TraineeLite[]>([])
  const [searchingTrainee, setSearchingTrainee] = useState(false)
  const [showTraineeDropdown, setShowTraineeDropdown] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadDependencies = async () => {
      try {
        const [pl, co] = await Promise.all([
          (window.api as any).gym?.plans?.getAll(),
          (window.api as any).gym?.coaches?.getAll({ take: 100 })
        ])
        const activePlans = Array.isArray(pl) ? pl.filter((p: any) => p.isActive !== false) : []
        setPlans(activePlans)
        setCoaches(Array.isArray(co) ? co : co?.data ?? [])

        if (renewTarget) {
          const matchingPlan = activePlans.find((p: Plan) => p.id === renewTarget.planId) || null
          setSelectedPlan(matchingPlan)
          setForm({
            traineeSearch: renewTarget.trainee?.name ?? '',
            traineeId: renewTarget.traineeId,
            traineeName: renewTarget.trainee?.name ?? '',
            planId: renewTarget.planId,
            coachId: renewTarget.coachId ?? '',
            startDate: new Date().toISOString().slice(0, 10),
            amountPaid: matchingPlan ? String(matchingPlan.price) : String(renewTarget.amountPaid ?? ''),
            paymentMethod: renewTarget.paymentMethod ?? 'cash',
            notes: ''
          })
        } else {
          setForm(defaultForm())
          setSelectedPlan(null)
        }
      } catch (err: any) {
        toast.error('Failed to load plans and coaches')
      }
    }

    loadDependencies()
  }, [isOpen, renewTarget, toast])

  const calculatedEndDate = selectedPlan && form.startDate
    ? calculateEndDateFromPlan(form.startDate, selectedPlan.durationDays)
    : null

  const searchTrainees = async (query: string) => {
    setForm(prev => ({ ...prev, traineeSearch: query, traineeId: '', traineeName: '' }))
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

  const selectTrainee = (trainee: TraineeLite) => {
    setForm(prev => ({
      ...prev,
      traineeId: trainee.id,
      traineeName: trainee.name,
      traineeSearch: trainee.name
    }))
    setTraineeResults([])
    setShowTraineeDropdown(false)
  }

  const selectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId) ?? null
    setSelectedPlan(plan)
    setForm(prev => ({
      ...prev,
      planId,
      amountPaid: plan ? String(plan.price) : prev.amountPaid
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.traineeId || !form.planId || !form.startDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const payload = {
        traineeId: form.traineeId,
        planId: form.planId,
        coachId: form.coachId || null,
        startDate: form.startDate,
        endDate: calculatedEndDate || calculateEndDateFromPlan(form.startDate, 30),
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || null
      }

      await (window.api as any).gym?.subscriptions?.create(payload)
      toast.success('Subscription registered successfully')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save subscription')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    setForm,
    saving,
    plans,
    coaches,
    selectedPlan,
    calculatedEndDate,
    traineeResults,
    searchingTrainee,
    showTraineeDropdown,
    setShowTraineeDropdown,
    searchTrainees,
    selectTrainee,
    selectPlan,
    handleSubmit
  }
}