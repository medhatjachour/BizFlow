/**
 * Installment Plans Section
 * Manage payment plans and installment schedules
 */

import { useEffect, useState } from 'react'
import { Calendar, CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, Percent, Clock } from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

interface InstallmentPlan {
  id: string
  name: string
  downPaymentPercent: number
  numberOfPayments: number
  intervalDays: number
  interestRate: number
  isActive: boolean
  createdAt: string
}

export default function InstallmentPlansSection() {
  const { success, error } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState<InstallmentPlan | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    downPaymentPercent: 20,
    numberOfPayments: 3,
    intervalDays: 30,
    interestRate: 0,
    isActive: true
  })

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const allPlans = await window.api.installmentPlans.getAll()
      setPlans(allPlans)
    } catch (err) {
      logger.error('Error loading installment plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPercent = (value: number) => {
    return `${value}%`
  }

  const getIntervalLabel = (days: number) => {
    if (days === 7) return t('weekly')
    if (days === 14) return t('biweekly')
    if (days === 30) return t('monthly')
    return t('everyNDays').replace('{0}', String(days))
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('installmentPlans')}</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('installmentPlans')}</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createPlan')}</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-lg mb-2">{t('noInstallmentPlans')}</p>
          <p className="text-sm">{t('createFirstPlan')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="glass-card p-5 border border-gray-700/50 hover:border-primary/50 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-center gap-2">
                    {plan.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        {t('activePlan')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="w-3 h-3" />
                        {t('inactivePlan')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingPlan(plan)
                      setFormData({
                        name: plan.name,
                        downPaymentPercent: plan.downPaymentPercent,
                        numberOfPayments: plan.numberOfPayments,
                        intervalDays: plan.intervalDays,
                        interestRate: plan.interestRate,
                        isActive: plan.isActive
                      })
                      setShowCreateModal(true)
                    }}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Edit plan"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingPlan(plan)
                      setShowDeleteConfirm(true)
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Plan Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">{t('downPayment')}</span>
                  </div>
                  <span className="font-bold text-blue-400">
                    {formatPercent(plan.downPaymentPercent)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">{t('paymentsCount')}</span>
                  </div>
                  <span className="font-bold text-green-400">
                    {plan.numberOfPayments}x
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">{t('intervalLabel')}</span>
                  </div>
                  <span className="font-semibold text-purple-400">
                    {getIntervalLabel(plan.intervalDays)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-gray-400">{t('interestRateLabel')}</span>
                  </div>
                  <span className={`font-bold ${plan.interestRate === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                    {formatPercent(plan.interestRate)}
                    {plan.interestRate === 0 && ` (${t('interestFree')})`}
                  </span>
                </div>
              </div>

              {/* Example Calculation */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 mb-2">{t('exampleFor')}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>{t('downPaymentAmount')}</span>
                    <span className="text-gray-300 font-semibold">
                      ${((1000 * plan.downPaymentPercent) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>{t('perPayment')}</span>
                    <span className="text-gray-300 font-semibold">
                      ${(((1000 * (100 - plan.downPaymentPercent)) / 100) / plan.numberOfPayments).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-primary mb-1">
            {plans.filter(p => p.isActive).length}
          </div>
          <div className="text-sm text-gray-400">{t('activePlans')}</div>
        </div>
        
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {plans.filter(p => p.interestRate === 0).length}
          </div>
          <div className="text-sm text-gray-400">{t('interestFreePlans')}</div>
        </div>
        
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {Math.min(...plans.map(p => p.downPaymentPercent))}%
          </div>
          <div className="text-sm text-gray-400">{t('minDownPayment')}</div>
        </div>
        
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {Math.max(...plans.map(p => p.numberOfPayments))}
          </div>
          <div className="text-sm text-gray-400">{t('maxPayments')}</div>
        </div>
      </div>

      {/* Create/Edit Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="glass-card p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-4">
              {editingPlan ? t('editPlanTitle') : t('createNewPlan')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">{t('planName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  placeholder={t('planNamePlaceholder')}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">{t('downPaymentPercent')}</label>
                <input
                  type="number"
                  value={formData.downPaymentPercent}
                  onChange={e => setFormData({...formData, downPaymentPercent: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">{t('numberOfPayments')}</label>
                <input
                  type="number"
                  value={formData.numberOfPayments}
                  onChange={e => setFormData({...formData, numberOfPayments: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  min="1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">{t('paymentInterval')}</label>
                <select
                  value={formData.intervalDays}
                  onChange={e => setFormData({...formData, intervalDays: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                >
                  <option value="7">{t('weeklyOption')}</option>
                  <option value="14">{t('biweeklyOption')}</option>
                  <option value="30">{t('monthlyOption')}</option>
                  <option value="60">{t('bimonthlyOption')}</option>
                  <option value="90">{t('quarterlyOption')}</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">{t('interestRatePercent')}</label>
                <input
                  type="number"
                  step="1"
                  value={formData.interestRate}
                  onChange={e => setFormData({...formData, interestRate: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">{t('activeCheckbox')}</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    name: '',
                    downPaymentPercent: 20,
                    numberOfPayments: 3,
                    intervalDays: 30,
                    interestRate: 0,
                    isActive: true
                  })
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={async () => {
                  try {
                    logger.info('Creating plan:', JSON.stringify(formData, null, 2))
                    
                    if (editingPlan) {
                      // Update existing plan
                      const result = await window.api.installmentPlans.update({
                        id: editingPlan.id,
                        data: formData
                      })
                      
                      if (result.success) {
                        success(t('planUpdatedSuccess'))
                      } else {
                        throw new Error(result.error || t('failedToUpdatePlan'))
                      }
                    } else {
                      // Create new plan
                      const result = await window.api.installmentPlans.create(formData)
                      
                      if (result.success) {
                        success(t('planCreatedSuccess'))
                      } else {
                        throw new Error(result.error || t('failedToCreatePlan'))
                      }
                    }
                    
                    setShowCreateModal(false)
                    setEditingPlan(null)
                    await loadPlans()
                  } catch (err) {
                    logger.error('Error creating/updating plan:', err)
                    error(`${editingPlan ? t('failedToUpdatePlan') : t('failedToCreatePlan')}: ${err instanceof Error ? err.message : 'Unknown error'}`)
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editingPlan ? t('updateButton') : t('createButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t('deleteInstallmentPlan')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('deleteConfirmMessage').replace('{0}', deletingPlan.name)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingPlan(null)
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={async () => {
                  try {
                    const result = await window.api.installmentPlans.delete(deletingPlan.id)
                    if (result.success) {
                      success(t('planDeletedSuccess'))
                      await loadPlans()
                    } else {
                      throw new Error(result.error || t('failedToDeletePlan'))
                    }
                  } catch (err) {
                    logger.error('Error deleting plan:', err)
                    error(`${t('failedToDeletePlan')}: ${err instanceof Error ? err.message : 'Unknown error'}`)
                  } finally {
                    setShowDeleteConfirm(false)
                    setDeletingPlan(null)
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('deletePlan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DollarSign({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
