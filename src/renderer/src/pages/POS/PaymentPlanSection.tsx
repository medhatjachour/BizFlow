import React, { useState } from 'react'
import { Calendar, DollarSign } from 'lucide-react'
import { PaymentPlan } from '../../components/PaymentPlan'
import DepositForm from './DepositForm'
import InstallmentForm from './InstallmentForm'

interface PaymentPlanSectionProps {
  customerId?: string
  saleId?: string
  onDepositAdded?: () => void
  onInstallmentAdded?: () => void
}

export const PaymentPlanSection: React.FC<PaymentPlanSectionProps> = ({
  customerId,
  saleId,
  onDepositAdded,
  onInstallmentAdded
}) => {
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showInstallmentForm, setShowInstallmentForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
          Payment Plan
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowDepositForm(true)}
            className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            title="Add Deposit"
          >
            <DollarSign size={14} />
          </button>
          <button
            onClick={() => setShowInstallmentForm(true)}
            className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            title="Add Installment"
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>

      <PaymentPlan customerId={customerId} saleId={saleId} refreshTrigger={refreshTrigger} />

      {/* Deposit Form Modal */}
      <DepositForm
        isOpen={showDepositForm}
        onClose={() => setShowDepositForm(false)}
        customerId={customerId}
        onSuccess={() => {
          setShowDepositForm(false)
          setRefreshTrigger(prev => prev + 1)
          onDepositAdded?.()
        }}
      />

      {/* Installment Form Modal */}
      <InstallmentForm
        isOpen={showInstallmentForm}
        onClose={() => setShowInstallmentForm(false)}
        customerId={customerId}
        onSuccess={() => {
          setShowInstallmentForm(false)
          setRefreshTrigger(prev => prev + 1)
          onInstallmentAdded?.()
        }}
      />
    </div>
  )
}
