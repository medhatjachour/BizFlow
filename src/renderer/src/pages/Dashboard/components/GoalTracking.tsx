/**
 * GoalTracking Component
 * Track monthly revenue, sales, and custom goals
 */

import { useState, useEffect } from 'react'
import { Target, TrendingUp, Edit2, Plus, X, Save } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

type Goal = {
  id: string
  name: string
  target: number
  current: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  type: 'revenue' | 'sales' | 'customers'
  goalTypeId: string // Links to GOAL_TYPES
}

export default function GoalTracking() {
  const { t } = useLanguage()
  
  // Load goals from localStorage or use defaults
  const loadInitialGoals = (): Goal[] => {
    try {
      const saved = localStorage.getItem('dashboard-goals')
      if (saved) {
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      logger.error('Error loading goals from localStorage:', error)
    }
    
    // Return default goals if nothing saved
    return [
      {
        id: '1',
        name: t('monthlyRevenue'),
        target: 50000,
        current: 0,
        period: 'monthly',
        type: 'revenue',
        goalTypeId: 'revenue'
      },
      {
        id: '2',
        name: t('weeklySales'),
        target: 100,
        current: 0,
        period: 'weekly',
        type: 'sales',
        goalTypeId: 'sales'
      },
      {
        id: '3',
        name: t('newCustomers'),
        target: 50,
        current: 0,
        period: 'monthly',
        type: 'customers',
        goalTypeId: 'new-customers'
      }
    ]
  }
  
  const [goals, setGoals] = useState<Goal[]>(loadInitialGoals)
  
  // Save goals to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-goals', JSON.stringify(goals))
    } catch (error) {
      logger.error('Error saving goals to localStorage:', error)
    }
  }, [goals])

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formData, setFormData] = useState({
    goalTypeId: '',
    target: 0,
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly'
  })

  useEffect(() => {
    loadGoalProgress()
  }, [])

  const loadGoalProgress = async () => {
    try {
      setLoading(true)
      
      // Get current month sales
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const endOfMonth = new Date()
      endOfMonth.setHours(23, 59, 59, 999)

      // @ts-ignore
      const financeData = await window.api['search:finance']({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString()
      })

      // Get new customers count for the current period
      let newCustomersCount = 0
      try {
        // @ts-ignore
        const customersResponse = await window.api.customers.getAll({
          limit: 10000, // Get all customers
          searchTerm: ''
        })
        
        if (customersResponse?.customers) {
          // Count customers created in current month
          newCustomersCount = customersResponse.customers.filter((customer: any) => {
            const createdAt = new Date(customer.createdAt)
            return createdAt >= startOfMonth && createdAt <= endOfMonth
          }).length
          
          logger.info(
            `📊 Goal Tracking – New Customers: total=${customersResponse.customers.length}, newInPeriod=${newCustomersCount}`
          )
        }
      } catch (error) {
        logger.error('Error loading customer data for goals:', error)
      }

      if (financeData) {
        setGoals(prev => prev.map(goal => {
          if (goal.type === 'revenue') {
            return { ...goal, current: financeData.currentMetrics.revenue || 0 }
          }
          if (goal.type === 'sales') {
            return { ...goal, current: financeData.currentMetrics.transactions || 0 }
          }
          if (goal.type === 'customers') {
            return { ...goal, current: newCustomersCount }
          }
          return goal
        }))
      }
    } catch (error) {
      logger.error('Error loading goal progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400'
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Goal type templates (user picks type + period separately)
  const GOAL_TYPES = [
    {
      id: 'revenue',
      name: 'Revenue',
      type: 'revenue' as const,
      description: 'Track total revenue for the period',
      defaultTargets: {
        daily: 2000,
        weekly: 15000,
        monthly: 50000,
        yearly: 600000
      }
    },
    {
      id: 'profit',
      name: 'Profit',
      type: 'revenue' as const,
      description: 'Track net profit (revenue - expenses)',
      defaultTargets: {
        daily: 800,
        weekly: 6000,
        monthly: 25000,
        yearly: 300000
      }
    },
    {
      id: 'sales',
      name: 'Sales Transactions',
      type: 'sales' as const,
      description: 'Track number of completed sales',
      defaultTargets: {
        daily: 20,
        weekly: 100,
        monthly: 400,
        yearly: 5000
      }
    },
    {
      id: 'new-customers',
      name: 'New Customers',
      type: 'customers' as const,
      description: 'Track newly acquired customers',
      defaultTargets: {
        daily: 5,
        weekly: 15,
        monthly: 50,
        yearly: 600
      }
    },
    {
      id: 'total-customers',
      name: 'Total Active Customers',
      type: 'customers' as const,
      description: 'Track total number of active customers',
      defaultTargets: {
        daily: 500,
        weekly: 500,
        monthly: 500,
        yearly: 1000
      }
    },
    {
      id: 'avg-transaction',
      name: 'Average Transaction Value',
      type: 'revenue' as const,
      description: 'Track average sale amount per transaction',
      defaultTargets: {
        daily: 100,
        weekly: 110,
        monthly: 125,
        yearly: 130
      }
    },
    {
      id: 'products-sold',
      name: 'Products Sold',
      type: 'sales' as const,
      description: 'Track total number of products sold',
      defaultTargets: {
        daily: 50,
        weekly: 250,
        monthly: 1000,
        yearly: 12000
      }
    },
    {
      id: 'revenue-growth',
      name: 'Revenue Growth Rate',
      type: 'revenue' as const,
      description: 'Track revenue growth percentage',
      defaultTargets: {
        daily: 5,
        weekly: 8,
        monthly: 10,
        yearly: 20
      }
    },
    {
      id: 'customer-retention',
      name: 'Customer Retention Rate',
      type: 'customers' as const,
      description: 'Track percentage of returning customers',
      defaultTargets: {
        daily: 70,
        weekly: 75,
        monthly: 80,
        yearly: 85
      }
    }
  ]

  const handleAddGoal = () => {
    setEditingGoal(null)
    setFormData({
      goalTypeId: '',
      target: 0,
      period: 'monthly'
    })
    setShowModal(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      goalTypeId: goal.goalTypeId,
      target: goal.target,
      period: goal.period
    })
    setShowModal(true)
  }

  const handleSaveGoal = () => {
    if (formData.target <= 0) {
      alert('Please enter a valid target value greater than 0')
      return
    }

    if (!formData.goalTypeId) {
      alert('Please select a goal type')
      return
    }

    const selectedGoalType = GOAL_TYPES.find(g => g.id === formData.goalTypeId)
    if (!selectedGoalType) {
      alert('Invalid goal type')
      return
    }

    if (editingGoal) {
      // Update existing goal's target and period
      setGoals(prev => prev.map(g => 
        g.id === editingGoal.id 
          ? { 
              ...g, 
              target: Number(formData.target),
              period: formData.period,
              name: `${getPeriodLabel(formData.period)} ${selectedGoalType.name}`
            }
          : g
      ))
    } else {
      // Add new goal with selected type and period
      const goalId = `${formData.goalTypeId}-${formData.period}-${Date.now()}`
      
      // Check if this exact goal already exists
      const exists = goals.some(g => 
        g.goalTypeId === formData.goalTypeId && 
        g.period === formData.period
      )
      if (exists) {
        alert(`A ${formData.period} ${selectedGoalType.name} goal already exists. You can edit it instead.`)
        return
      }

      const newGoal: Goal = {
        id: goalId,
        name: `${getPeriodLabel(formData.period)} ${selectedGoalType.name}`,
        target: Number(formData.target),
        current: 0,
        period: formData.period,
        type: selectedGoalType.type,
        goalTypeId: formData.goalTypeId
      }
      setGoals(prev => [...prev, newGoal])
    }

    setShowModal(false)
    setEditingGoal(null)
    
    // Reload progress after saving
    setTimeout(() => loadGoalProgress(), 500)
  }

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    }
    return labels[period] || period
  }

  return (
    <>
      {/* Goal Tracking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'Add New Goal'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Goal Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Goal Type
                </label>
                <select
                  value={formData.goalTypeId}
                  onChange={(e) => {
                    const selected = GOAL_TYPES.find(g => g.id === e.target.value)
                    setFormData({ 
                      ...formData, 
                      goalTypeId: e.target.value,
                      target: selected?.defaultTargets[formData.period] || 0
                    })
                  }}
                  disabled={!!editingGoal}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Choose a goal type --</option>
                  {GOAL_TYPES.map(goalType => (
                    <option key={goalType.id} value={goalType.id}>
                      {goalType.name}
                    </option>
                  ))}
                </select>
                {formData.goalTypeId && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {GOAL_TYPES.find(g => g.id === formData.goalTypeId)?.description}
                  </p>
                )}
              </div>

              {/* Time Period Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Time Period
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => {
                    const period = e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
                    const selectedGoalType = GOAL_TYPES.find(g => g.id === formData.goalTypeId)
                    setFormData({ 
                      ...formData, 
                      period,
                      target: selectedGoalType?.defaultTargets[period] || formData.target
                    })
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Target Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Value
                  {formData.goalTypeId && GOAL_TYPES.find(g => g.id === formData.goalTypeId)?.type === 'revenue' && ' ($)'}
                  {formData.goalTypeId && GOAL_TYPES.find(g => g.id === formData.goalTypeId)?.type === 'sales' && ' (transactions/products)'}
                  {formData.goalTypeId && GOAL_TYPES.find(g => g.id === formData.goalTypeId)?.type === 'customers' && ' (customers/%)'}
                </label>
                <input
                  type="number"
                  value={formData.target || ''}
                  onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter target value"
                  min="0"
                  step={formData.goalTypeId && GOAL_TYPES.find(g => g.id === formData.goalTypeId)?.type === 'revenue' ? '100' : '1'}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSaveGoal}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {editingGoal ? 'Update Goal' : 'Add Goal'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Tracking Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Target size={18} className="text-primary" />
            {t('goalTracking')}
          </h3>
          <button 
            onClick={handleAddGoal}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Add new goal"
          >
            <Plus size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2"></div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const percentage = (goal.current / goal.target) * 100
            const isCompleted = percentage >= 100

            return (
              <div key={goal.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {goal.name}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {goal.period}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {goal.type === 'revenue' && `$${goal.current.toFixed(0)} / $${goal.target.toFixed(0)}`}
                      {goal.type === 'sales' && `${goal.current} / ${goal.target} transactions`}
                      {goal.type === 'customers' && `${goal.current} / ${goal.target} customers`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getProgressTextColor(percentage)}`}>
                      {percentage.toFixed(0)}%
                    </span>
                    <button 
                      onClick={() => handleEditGoal(goal)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                      title="Edit goal"
                    >
                      <Edit2 size={14} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(percentage)} transition-all duration-500 rounded-full ${
                      isCompleted ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                {isCompleted && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                    <TrendingUp size={12} />
                    Goal achieved! 🎉
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>
    </>
  )
}
