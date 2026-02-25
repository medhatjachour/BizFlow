import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, Calendar, AlertCircle, Search, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { ipc } from '../utils/ipc'
import logger from '../../../shared/utils/logger'

interface Installment {
  id: string
  amount: number
  dueDate: string | number
  status: 'pending' | 'paid' | 'overdue'
  paidDate?: string
  notes?: string
  customerName: string
  customerId: string
  saleId?: string
}

interface InstallmentManagerProps {
  isOpen: boolean
  onClose: () => void
  customerId?: string
  customerName?: string
  transactionId?: string
}

export const InstallmentManager: React.FC<InstallmentManagerProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  transactionId
}) => {
  const { showToast } = useToast()
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'paid' | 'overdue'>('ALL')

  const loadInstallments = async () => {
    try {
      setLoading(true)
      let result

      // If we have specific filters, use them
      if (customerId) {
        result = await ipc.installments.getByCustomer(customerId)
      } else if (transactionId) {
        result = await ipc.installments.getBySale(transactionId)
      } else {
        result = await ipc.installments.list()
      }

      if (result && Array.isArray(result)) {
        // Add customer names to installments if not already present
        const installmentsWithCustomers = result.map((installment: any) => {
          return {
            ...installment,
            customerName: installment.customerName || customerName || 'Unknown Customer'
          }
        })

        setInstallments(installmentsWithCustomers)
      } else {
        setInstallments([])
      }
    } catch (error) {
      logger.error('Error loading installments:', error)
      showToast('error', `Failed to load installments: ${error}`)
      setInstallments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadInstallments()
    }
  }, [isOpen, customerId, customerName, transactionId])

  const markInstallmentAsPaid = async (installmentId: string) => {
    try {
      setMarkingPaid(installmentId)

      const result = await ipc.installments.markAsPaid({
        installmentId: installmentId,
        paidDate: new Date().toISOString()
      })

      if (result.success) {
        showToast('success', 'Installment marked as paid')
        loadInstallments() // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to mark installment as paid')
      }
    } catch (error) {
      logger.error('Error marking installment as paid:', error)
      showToast('error', 'Failed to mark installment as paid')
    } finally {
      setMarkingPaid(null)
    }
  }

  const filteredInstallments = installments.filter(installment => {
    const matchesSearch = searchQuery === '' ||
      installment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      installment.amount.toString().includes(searchQuery)

    const matchesStatus = statusFilter === 'ALL' || installment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string, dueDate?: string | number) => {
    const today = new Date()
    const due = dueDate ? new Date(dueDate) : null

    if (status === 'paid') {
      return 'text-green-600 dark:text-green-400'
    }

    if (status === 'overdue' || (due && due < today && status === 'pending')) {
      return 'text-red-600 dark:text-red-400'
    }

    return 'text-slate-600 dark:text-slate-400'
  }

  const getStatusIcon = (status: string, dueDate?: string | number) => {
    const today = new Date()
    const due = dueDate ? new Date(dueDate) : null

    if (status === 'paid') {
      return <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
    }

    if (status === 'overdue' || (due && due < today && status === 'pending')) {
      return <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
    }

    return <Clock size={16} className="text-slate-600 dark:text-slate-400" />
  }

  const formatDate = (dateInput: string | number) => {
    return new Date(dateInput).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const pendingCount = installments.filter(i => i.status === 'pending').length
  const overdueCount = installments.filter(i =>
    i.status === 'overdue' ||
    (new Date(i.dueDate) < new Date() && i.status === 'pending')
  ).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Installment Manager
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {pendingCount} pending • {overdueCount} overdue
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2">
              {(['ALL', 'pending', 'paid', 'overdue'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No installments found
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No installments have been created yet'
                }
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {filteredInstallments.map((installment) => {
                  return (
                  <div key={installment.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    installment.status === 'paid'
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : installment.status === 'overdue' || (new Date(installment.dueDate) < new Date() && installment.status === 'pending')
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-4">
                      {getStatusIcon(installment.status, installment.dueDate)}
                      <div>
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${getStatusColor(installment.status, installment.dueDate)}`}>
                            ${installment.amount.toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {installment.customerName}
                          </span>
                        </div>
                        <div className={`text-sm ${getStatusColor(installment.status, installment.dueDate)}`}>
                          Due: {formatDate(installment.dueDate)}
                          {installment.status === 'paid' && installment.paidDate && (
                            <span className="ml-3">• Paid: {formatDate(installment.paidDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {installment.status === 'pending' && (
                      <button
                        onClick={() => markInstallmentAsPaid(installment.id)}
                        disabled={markingPaid === installment.id}
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {markingPaid === installment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Mark as Paid
                      </button>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}