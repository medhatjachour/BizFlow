import React, { useState, useEffect } from 'react'
import { DollarSign, CreditCard, Calendar, CheckCircle, Clock, ArrowRight, User } from 'lucide-react'
import { PaymentPlan } from '../../components/PaymentPlan'
import DepositForm from './DepositForm'
import InstallmentForm from './InstallmentForm'
import CustomerSelect from './CustomerSelect'
import InstallmentPlanSelector from './InstallmentPlanSelector'
import type { Customer } from './types'

interface PaymentFlowSelectorProps {
  customerId?: string
  selectedCustomer?: Customer | null
  customers: Customer[]
  customerQuery: string
  onCustomerSelect: (customer: Customer | null) => void
  onCustomerQueryChange: (query: string) => void
  onAddNewCustomer: () => void
  saleId?: string
  total: number
  isProcessing?: boolean
  onFullPayment: (method: 'cash' | 'card') => void
  onPartialPayment: () => void
  onCompleteInstallmentSale?: () => void
  onDepositAdded?: () => void
  onInstallmentAdded?: () => void
}

type PaymentFlow = 'select' | 'full-payment' | 'installment-plan'

export const PaymentFlowSelector: React.FC<PaymentFlowSelectorProps> = ({
  selectedCustomer,
  customers,
  customerQuery,
  onCustomerSelect,
  onCustomerQueryChange,
  onAddNewCustomer,
  saleId,
  total,
  isProcessing = false,
  onFullPayment,
  onPartialPayment,
  onCompleteInstallmentSale,
  onDepositAdded,
  onInstallmentAdded
}) => {
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>('full-payment')
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showInstallmentForm, setShowInstallmentForm] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Clean up unlinked deposits and installments when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      const cleanupUnlinkedPayments = async () => {
        try {
          console.log('🧹 Cleaning up unlinked payments for customer:', selectedCustomer.id)
          
          // Clean up unlinked deposits
          const depositResult = await (window as any).api.delete.cleanupUnlinkedDeposits(selectedCustomer.id)
          
          // Clean up unlinked installments
          const installmentResult = await (window as any).api.delete.cleanupUnlinkedInstallments(selectedCustomer.id)
          
          if (depositResult.success && installmentResult.success) {
            const totalCleaned = (depositResult.deletedCount || 0) + (installmentResult.deletedCount || 0)
            if (totalCleaned > 0) {
              console.log(`✅ Cleaned up ${totalCleaned} unlinked payments for customer ${selectedCustomer.name}`)
              // Refresh the payment plan display
              setRefreshTrigger(prev => prev + 1)
            }
          }
        } catch (error) {
          console.error('❌ Error cleaning up unlinked payments:', error)
        }
      }
      
      cleanupUnlinkedPayments()
    }
  }, [selectedCustomer])

  const handleFullPayment = (method: 'cash' | 'card') => {
    onFullPayment(method)
  }

  const handlePartialPayment = () => {
    setPaymentFlow('installment-plan')
    onPartialPayment()
  }

  if (paymentFlow === 'full-payment') {
    return (
      <div className="flex flex-col h-full px-4 py-3">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setPaymentFlow('select')}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
          </button>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Pay Full Amount
          </h3>
        </div>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 dark:text-green-400 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Complete Payment
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Pay the full amount now and complete the transaction immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Customer Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Customer (Optional)
              </span>
            </div>
            <CustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer ?? null}
              customerQuery={customerQuery}
              onSelectCustomer={onCustomerSelect}
              onQueryChange={onCustomerQueryChange}
              onAddNewCustomer={onAddNewCustomer}
            />
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${total.toFixed(2)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Amount
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleFullPayment('cash')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign size={20} />
                    Pay Cash
                  </>
                )}
              </button>
              <button
                onClick={() => handleFullPayment('card')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Pay Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* More Options Link */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setPaymentFlow('select')}
            disabled={isProcessing}
            className="w-full text-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            More payment options (Deposit, Installment)
          </button>
        </div>
      </div>
    )
  }

  if (paymentFlow === 'installment-plan') {
    // If no customer selected, show customer selection first
    if (!selectedCustomer) {
      return (
        <div className="flex flex-col h-full">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setPaymentFlow('select')}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Select Customer
              </h3>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <User className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Customer Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Installment plans require a customer to be selected for payment tracking.
                  </p>
                </div>
              </div>
            </div>

            <CustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer ?? null}
              customerQuery={customerQuery}
              onSelectCustomer={onCustomerSelect}
              onQueryChange={onCustomerQueryChange}
              onAddNewCustomer={onAddNewCustomer}
            />
          </div>

          {/* Fixed Action Button at Bottom */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
              onClick={() => setPaymentFlow('select')}
              className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← Back to Payment Options
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full max-h-screen">
        {/* Scrollable Content - Give more height to installment plan */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-4 min-h-0">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setPaymentFlow('select')}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowRight size={16} className="rotate-180" />
            </button>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Installment Plan
            </h3>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Clock className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Flexible Payment for {selectedCustomer.name}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Pay a deposit now and schedule the remaining amount in installments.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Plan Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount:</span>
              <span className="font-semibold text-slate-900 dark:text-white">${total.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">Paid:</span>
                <span className="font-medium text-green-600 dark:text-green-400">$0.00</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-slate-600 dark:text-slate-400">Remaining:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Installment Plan Selector */}
          <div className="mb-4">
            <InstallmentPlanSelector
              totalAmount={total}
              onPlanSelect={async (planId, schedule) => {
                console.log('📋 Plan selected:', { planId, schedule })
                setSelectedPlanId(planId) // Track selected plan
                // Auto-create deposit and installments based on schedule
                if (selectedCustomer && !saleId) {
                  try {
                    // FIRST: Clean up any existing unlinked deposits/installments for this customer
                    console.log('🧹 Cleaning up old unlinked payments before creating new plan...')
                    await Promise.all([
                      (window as any).api.delete.cleanupUnlinkedDeposits(selectedCustomer.id),
                      (window as any).api.delete.cleanupUnlinkedInstallments(selectedCustomer.id)
                    ])
                    
                    // THEN: Create deposit for down payment
                    if (schedule.downPayment > 0) {
                      await (window as any).api.deposits.create({
                        customerId: selectedCustomer.id,
                        amount: schedule.downPayment,
                        method: 'cash',
                        status: 'pending',
                        date: new Date().toISOString()
                      })
                    }
                    
                    // Create installments
                    for (const installment of schedule.installments) {
                      await (window as any).api.installments.create({
                        customerId: selectedCustomer.id,
                        amount: installment.amount,
                        dueDate: installment.dueDate,
                        status: 'pending'
                      })
                    }
                    
                    // Refresh the payment plan display
                    setRefreshTrigger(prev => prev + 1)
                  } catch (error) {
                    console.error('Failed to create payment schedule:', error)
                  }
                }
              }}
              onManualEntry={() => {
                // Show manual entry form and clear selected plan
                setSelectedPlanId(null)
                setShowDepositForm(true)
              }}
            />
          </div>

          {/* Current Payment Plan - Expanded height */}
          <div className="space-y-3 flex-1 min-h-[400px]">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                Current Plan
              </h4>
              {/* Only show manual add buttons when no plan is selected */}
              {!selectedPlanId && (
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
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 min-h-[300px] overflow-auto">
              <PaymentPlan customerId={selectedCustomer.id} saleId={saleId} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons at Bottom */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="space-y-3">
            {/* Quick Payment Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleFullPayment('cash')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign size={20} />
                    Pay Cash
                  </>
                )}
              </button>
              <button
                onClick={() => handleFullPayment('card')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Pay Card
                  </>
                )}
              </button>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={onCompleteInstallmentSale}
              disabled={isProcessing}
              className="w-full py-3 text-base font-bold rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Complete Sale
                </>
              )}
            </button>

            <button
              onClick={() => setPaymentFlow('select')}
              disabled={isProcessing}
              className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back to Payment Options
            </button>
          </div>
        </div>

        {/* Deposit Form Modal */}
        <DepositForm
          isOpen={showDepositForm}
          onClose={() => setShowDepositForm(false)}
          customerId={selectedCustomer.id}
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
          customerId={selectedCustomer.id}
          onSuccess={() => {
            setShowInstallmentForm(false)
            setRefreshTrigger(prev => prev + 1)
            onInstallmentAdded?.()
          }}
        />
      </div>
    )
  }

  // Default: Payment Flow Selection
  return (
    <div className="flex flex-col h-full px-4 py-3">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-6">
        Choose Payment Method
      </h3>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div className="space-y-3">
          {/* Full Payment Option */}
          <button
            onClick={() => setPaymentFlow('full-payment')}
            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Pay Full Amount
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Complete payment now with cash or card. Customer optional.
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ${total.toFixed(2)} total
                  </span>
                  <span className="text-slate-500 dark:text-slate-500">
                    No installments
                  </span>
                </div>
              </div>
              <ArrowRight className="text-slate-400 group-hover:text-primary transition-colors" size={20} />
            </div>
          </button>

          {/* Installment Plan Option */}
          <button
            onClick={() => handlePartialPayment()}
            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Installment Plan
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Pay deposit now, rest in installments
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    ${total.toFixed(2)} total
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Flexible payments
                  </span>
                </div>
              </div>
              <ArrowRight className="text-slate-400 group-hover:text-primary transition-colors" size={20} />
            </div>
          </button>
        </div>

        {/* Quick Cash Option */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleFullPayment('cash')}
            className="w-full py-3 text-base font-semibold rounded-lg flex items-center justify-center gap-2 bg-gradient-to-r from-success to-emerald-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            <DollarSign size={20} />
            Quick Cash Payment
          </button>
        </div>
      </div>
    </div>
  )
}