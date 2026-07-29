import { X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PaymentFlowSelector } from '../../POS/components/PaymentFlowSelector'
import type { Customer } from '../../POS/types'

type PaymentModalProps = {
  selectedCustomer: Customer | null
  customers: Customer[]
  customerQuery: string
  total: number
  onCustomerSelect: (customer: Customer | null) => void
  onCustomerQueryChange: (query: string) => void
  onAddNewCustomer: () => void
  onFullPayment: (method: string) => void
  onCompleteInstallmentSale: () => void
  onClose: () => void
}

export function PaymentModal({
  selectedCustomer,
  customers,
  customerQuery,
  total,
  onCustomerSelect,
  onCustomerQueryChange,
  onAddNewCustomer,
  onFullPayment,
  onCompleteInstallmentSale,
  onClose,
}: PaymentModalProps) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('checkout')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <PaymentFlowSelector
            selectedCustomer={selectedCustomer}
            customers={customers}
            customerQuery={customerQuery}
            onCustomerSelect={onCustomerSelect}
            onCustomerQueryChange={onCustomerQueryChange}
            onAddNewCustomer={onAddNewCustomer}
            total={total}
            onFullPayment={(method) => {
              onClose()
              onFullPayment(method)
            }}
            onPartialPayment={() => {
              // Switch to installment view — no immediate action
            }}
            onCompleteInstallmentSale={() => {
              onClose()
              onCompleteInstallmentSale()
            }}
            onDepositAdded={() => {}}
            onInstallmentAdded={() => {}}
          />
        </div>
      </div>
    </div>
  )
}