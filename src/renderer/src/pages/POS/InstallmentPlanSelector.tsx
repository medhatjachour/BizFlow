/**
 * Installment Plan Selector Component
 * Allows selecting an installment plan and previews the payment schedule
 */

import { useEffect, useState } from 'react'
import { Calendar, DollarSign, CheckCircle, Edit } from 'lucide-react'
import logger from '../../../../shared/utils/logger'

interface InstallmentPlan {
  id: string
  name: string
  downPaymentPercent: number
  numberOfPayments: number
  intervalDays: number
  interestRate: number
  isActive: boolean
}

interface PaymentSchedule {
  downPayment: number
  installments: Array<{
    amount: number
    dueDate: string
  }>
  totalAmount: number
}

interface InstallmentPlanSelectorProps {
  totalAmount: number
  onPlanSelect: (planId: string, schedule: PaymentSchedule) => void
  onManualEntry: () => void
  selectedPlanId?: string
}

export default function InstallmentPlanSelector({
  totalAmount,
  onPlanSelect,
  onManualEntry,
  selectedPlanId
}: InstallmentPlanSelectorProps) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null)
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (selectedPlan && totalAmount > 0) {
      calculateSchedule(selectedPlan)
    }
  }, [selectedPlan, totalAmount])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const activePlans = await window.api.installmentPlans.getActive()
      // Ensure we always set an array, even if API returns null/undefined
      setPlans(Array.isArray(activePlans) ? activePlans : [])
      
      // Auto-select first plan if available
      if (Array.isArray(activePlans) && activePlans.length > 0 && !selectedPlanId) {
        const firstPlan = activePlans[0]
        setSelectedPlan(firstPlan)
      } else if (selectedPlanId && Array.isArray(activePlans)) {
        const plan = activePlans.find(p => p.id === selectedPlanId)
        if (plan) setSelectedPlan(plan)
      }
    } catch (err) {
      logger.error('Error loading installment plans:', err)
      setPlans([]) // Ensure empty array on error
    } finally {
      setLoading(false)
    }
  }

  const calculateSchedule = async (plan: InstallmentPlan) => {
    try {
      const response = await window.api.installmentPlans.calculateSchedule({
        planId: plan.id,
        saleTotal: totalAmount,
        customDownPayment: undefined
      })
      
      // Unwrap the response from the IPC handler
      if (response?.success && response.schedule) {
        const result = response.schedule
        // Ensure result has installments array
        if (result && Array.isArray(result.installments)) {
          setSchedule(result)
          onPlanSelect(plan.id, result)
        } else {
          logger.error('Invalid schedule result:', result)
          setSchedule(null)
        }
      } else {
        logger.error('Failed to calculate schedule:', response?.error)
        setSchedule(null)
      }
    } catch (err) {
      logger.error('Error calculating schedule:', err)
      setSchedule(null)
    }
  }

  const handlePlanSelect = (plan: InstallmentPlan) => {
    setSelectedPlan(plan)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getIntervalLabel = (days: number) => {
    if (days === 7) return 'Weekly'
    if (days === 14) return 'Bi-weekly'
    if (days === 30) return 'Monthly'
    return `Every ${days} days`
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-gray-400 mt-2">Loading payment plans...</p>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 mb-4">No installment plans available</p>
        <button
          onClick={onManualEntry}
          className="btn btn-secondary"
        >
          Enter Manually
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plan Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Select Payment Plan</h3>
          <button
            onClick={onManualEntry}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Edit className="w-3 h-3" />
            Manual Entry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans && plans.length > 0 && plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`glass-card p-4 text-left transition-all ${
                selectedPlan?.id === plan.id
                  ? 'ring-2 ring-primary bg-primary/10'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-bold text-foreground mb-1">{plan.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{plan.numberOfPayments} payments</span>
                    <span>•</span>
                    <span>{getIntervalLabel(plan.intervalDays)}</span>
                  </div>
                </div>
                {selectedPlan?.id === plan.id && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Down Payment:</span>
                  <span className="font-semibold text-blue-400">{plan.downPaymentPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Interest Rate:</span>
                  <span className={`font-semibold ${plan.interestRate === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                    {plan.interestRate}%
                    {plan.interestRate === 0 && ' (Interest-free)'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Schedule Preview */}
      {selectedPlan && schedule && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Payment Schedule Preview
          </h3>

          <div className="space-y-2 mb-4">
            {/* Down Payment */}
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Down Payment</div>
                  <div className="text-xs text-gray-400">Due today</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{formatCurrency(schedule.downPayment)}</div>
                <div className="text-xs text-gray-400">{selectedPlan.downPaymentPercent}% of total</div>
              </div>
            </div>

            {/* Installments */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {schedule.installments && schedule.installments.length > 0 && schedule.installments.map((installment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-800/30 border border-gray-700/50 rounded-lg"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-300">
                      Payment {index + 1} of {schedule.installments.length}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(installment.dueDate)}</div>
                  </div>
                  <div className="font-semibold text-foreground">{formatCurrency(installment.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Amount:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(schedule.totalAmount)}</span>
            </div>
            {selectedPlan.interestRate > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">Original Amount:</span>
                <span className="text-sm text-gray-400">{formatCurrency(totalAmount)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
