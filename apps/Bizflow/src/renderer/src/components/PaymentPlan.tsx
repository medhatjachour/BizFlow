import React, { useEffect, useState } from 'react'
import { DollarSign, Calendar, CheckCircle, Clock, AlertTriangle, Check } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

export type Deposit = {
  id: string
  amount: number
  date: string
  method: string
  note?: string
}

export type Installment = {
  id: string
  amount: number
  dueDate: string
  paidDate?: string
  status: string
  note?: string
}

interface PaymentPlanProps {
  customerId?: string
  saleId?: string
  refreshTrigger?: number
}

export const PaymentPlan: React.FC<PaymentPlanProps> = ({ customerId, saleId, refreshTrigger }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        if (customerId && !saleId) {
          // POS context: show only deposits/installments created in the current session
          const [depositData, installmentData] = await Promise.all([
            window.api.deposits.getByCustomer(customerId),
            window.api.installments.getByCustomer(customerId)
          ])
          
          // Filter to show only recent ones (created in the last 30 minutes) that are not linked to any sale
          // This ensures we only show deposits/installments created in the current POS session
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
          const recentDeposits = depositData.filter((d: any) => 
            !d.saleId && new Date(d.createdAt) > thirtyMinutesAgo
          )
          const recentInstallments = installmentData.filter((i: any) => 
            !i.saleId && new Date(i.createdAt) > thirtyMinutesAgo
          )
          
          setDeposits(recentDeposits)
          setInstallments(recentInstallments)
        } else if (saleId) {
          // Sale details context: show deposits/installments for this specific sale
          const [depositData, installmentData] = await Promise.all([
            window.api.deposits.getBySale(saleId),
            window.api.installments.getBySale(saleId)
          ])
          setDeposits(depositData)
          setInstallments(installmentData)
        }
      } catch (error) {
        logger.error('Error loading payment plan:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [customerId, saleId, refreshTrigger])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="text-green-500" size={16} />
      case 'overdue':
        return <AlertTriangle className="text-red-500" size={16} />
      default:
        return <Clock className="text-yellow-500" size={16} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800'
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
    }
  }

  const handleMarkAsPaid = async (installmentId: string) => {
    try {
      const result = await window.api.installments.markAsPaid({ 
        installmentId,
        paidDate: new Date().toISOString()
      })
      
      if (result.success) {
        // Refresh the data without full page reload
        if (customerId && !saleId) {
          const [depositData, installmentData] = await Promise.all([
            window.api.deposits.getByCustomer(customerId),
            window.api.installments.getByCustomer(customerId)
          ])
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
          setDeposits(depositData.filter((d: any) => !d.saleId && new Date(d.createdAt) > thirtyMinutesAgo))
          setInstallments(installmentData.filter((i: any) => !i.saleId && new Date(i.createdAt) > thirtyMinutesAgo))
        } else if (saleId) {
          const [depositData, installmentData] = await Promise.all([
            window.api.deposits.getBySale(saleId),
            window.api.installments.getBySale(saleId)
          ])
          setDeposits(depositData)
          setInstallments(installmentData)
        }
      } else {
        alert('Failed to mark installment as paid: ' + result.error)
      }
    } catch (error) {
      logger.error('Error marking installment as paid:', error)
      alert('Failed to mark installment as paid')
    }
  }

  const totalDeposits = deposits.reduce((sum, dep) => sum + dep.amount, 0)
  const totalInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0)
  const paidInstallments = installments.filter(inst => inst.status === 'paid').reduce((sum, inst) => sum + inst.amount, 0)
  const pendingInstallments = installments.filter(inst => inst.status === 'pending').length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
          <div className="font-semibold text-green-800 dark:text-green-200">${totalDeposits.toFixed(2)}</div>
          <div className="text-green-600 dark:text-green-400">{t('deposits')}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-center">
          <div className="font-semibold text-blue-800 dark:text-blue-200">${totalInstallments.toFixed(2)}</div>
          <div className="text-blue-600 dark:text-blue-400">{t('totalDue')}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-center">
          <div className="font-semibold text-purple-800 dark:text-purple-200">${paidInstallments.toFixed(2)}</div>
          <div className="text-purple-600 dark:text-purple-400">{t('paid')}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-center">
          <div className="font-semibold text-orange-800 dark:text-orange-200">{pendingInstallments}</div>
          <div className="text-orange-600 dark:text-orange-400">{t('pending')}</div>
        </div>
      </div>

      {/* Deposits Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={14} className="text-green-600" />
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">{t('deposits')}</h4>
        </div>
        {deposits.length > 0 ? (
          <div className="space-y-2">
            {deposits.map(dep => (
              <div key={dep.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-green-800 dark:text-green-200">${dep.amount.toFixed(2)}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {new Date(dep.date).toLocaleDateString()} • {dep.method}
                    </div>
                    {dep.note && (
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">{dep.note}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
            {t('noDepositsYet')}
          </div>
        )}
      </div>

      {/* Installments Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-blue-600" />
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">{t('installments')}</h4>
        </div>
        {installments.length > 0 ? (
          <div className="space-y-2">
            {installments.map(inst => (
              <div key={inst.id} className={`border rounded-lg p-3 ${getStatusColor(inst.status)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(inst.status)}
                      <span className="font-semibold">${inst.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-xs mt-1">
                      {t('due')}: {new Date(inst.dueDate).toLocaleDateString()}
                      {inst.paidDate && (
                        <span className="ml-2">
                          • {t('paid')}: {new Date(inst.paidDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {inst.note && (
                      <div className="text-xs mt-1 opacity-80">{inst.note}</div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {inst.status === 'pending' && (
                      <button
                        onClick={() => handleMarkAsPaid(inst.id)}
                        className="p-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        title={t('markAsPaid')}
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
            {t('noInstallmentsScheduled')}
          </div>
        )}
      </div>
    </div>
  )
}