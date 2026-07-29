import { useState } from 'react'
import { RefreshCcw, Download } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useLocation } from 'react-router-dom'

import { InstallmentManager } from '@renderer/components/InstallmentManager'
import type { SalesTab } from './types'
import {
  useSalesTransactions,
  useInstallments,
  useSalesActions
} from './hooks'
import {
  StatsCards,
  SalesFilters,
  InstallmentsFilters,
  EmptySalesState,
  TransactionsTable,
  InstallmentsTable,
  TransactionViewModal
} from './components'
import RefundItemsModal from './components/RefundItemsModal'
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal'

export default function Sales(): JSX.Element {
  const location = useLocation()
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<SalesTab>(() => {
    const searchParams = new URLSearchParams(location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam === 'installments') return 'installments'
    const state = location.state as { activeTab?: string } | null
    if (state?.activeTab === 'installments') return 'installments'
    return 'sales'
  })

  const sales = useSalesTransactions()
  const installments = useInstallments(activeTab === 'installments')
  const actions = useSalesActions(sales.loadTransactions)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'sales' ? t('sales') : t('installments')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {activeTab === 'sales'
              ? t('salesHistory')
              : 'Track and manage customer installment payments'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={
              activeTab === 'sales'
                ? sales.loadTransactions
                : () => installments.loadInstallments(1)
            }
            disabled={
              activeTab === 'sales' ? sales.loading : installments.loading
            }
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCcw
              size={20}
              className={
                (activeTab === 'sales' ? sales.loading : installments.loading)
                  ? 'animate-spin'
                  : ''
              }
            />
            {t('refresh')}
          </button>
          <button
            onClick={
              activeTab === 'sales'
                ? sales.handleExport
                : installments.handleExport
            }
            className="btn-primary flex items-center gap-2"
          >
            <Download size={20} />
            {t('export')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('sales')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sales'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t('sales')}
          </button>
          <button
            onClick={() => setActiveTab('installments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'installments'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t('installments')}
          </button>
        </nav>
      </div>

      {/* Sales tab */}
      {activeTab === 'sales' && (
        <>
          <StatsCards stats={sales.stats} />

          {sales.transactions.length === 0 && !sales.loading && (
            <EmptySalesState />
          )}

          {sales.transactions.length > 0 && (
            <SalesFilters
              searchQuery={sales.searchQuery}
              dateFilter={sales.dateFilter}
              filteredCount={sales.filteredTransactions.length}
              onSearchChange={sales.setSearchQuery}
              onDateFilterChange={sales.setDateFilter}
            />
          )}

          {(sales.loading || sales.transactions.length > 0) && (
            <TransactionsTable
              loading={sales.loading}
              transactions={sales.transactions}
              filteredTransactions={sales.filteredTransactions}
              paginatedTransactions={sales.paginatedTransactions}
              expandedTransactions={sales.expandedTransactions}
              currentPage={sales.currentPage}
              totalPages={sales.totalPages}
              refundsEnabled={actions.refundsEnabled}
              isWithinRefundPeriod={actions.isWithinRefundPeriod}
              refundPeriodDays={actions.refundPeriodDays}
              onPageChange={sales.setCurrentPage}
              onToggleExpand={sales.toggleExpanded}
              onView={actions.handleViewTransaction}
              onReceipt={actions.handleViewReceipt}
              onInstallments={actions.handleInstallmentManager}
              onPartialRefund={actions.handlePartialRefund}
            />
          )}
        </>
      )}

      {/* Installments tab */}
      {activeTab === 'installments' && (
        <div className="space-y-6">
          <InstallmentsFilters
            searchQuery={installments.searchQuery}
            statusFilter={installments.statusFilter}
            dateFilter={installments.dateFilter}
            totalItems={installments.totalItems}
            onSearchChange={installments.setSearchQuery}
            onStatusFilterChange={installments.setStatusFilter}
            onDateFilterChange={installments.setDateFilter}
          />
          <InstallmentsTable
            loading={installments.loading}
            installments={installments.installments}
            currentPage={installments.currentPage}
            totalPages={installments.totalPages}
            totalItems={installments.totalItems}
            onPageChange={installments.loadInstallments}
            onMarkAsPaid={installments.handleMarkAsPaid}
          />
        </div>
      )}

      {/* Modals */}
      {actions.showViewModal && actions.selectedTransaction && (
        <TransactionViewModal
          transaction={actions.selectedTransaction}
          refundsEnabled={actions.refundsEnabled}
          isWithinRefundPeriod={actions.isWithinRefundPeriod}
          refundPeriodDays={actions.refundPeriodDays}
          onClose={actions.closeViewModal}
          onPartialRefund={() => {
            actions.closeViewModal()
            actions.handlePartialRefund(actions.selectedTransaction!)
          }}
          onFullRefund={() => {
            actions.closeViewModal()
            actions.handleRefund(actions.selectedTransaction!.id)
          }}
        />
      )}

      <RefundItemsModal
        show={actions.showRefundModal}
        transaction={actions.selectedTransaction as any}
        onClose={actions.closeRefundModal}
        onRefund={actions.handleRefundItems}
      />

      {actions.showInstallmentManager &&
        actions.selectedTransactionForInstallments && (
          <InstallmentManager
            isOpen={actions.showInstallmentManager}
            onClose={actions.closeInstallmentManager}
            transactionId={actions.selectedTransactionForInstallments.id}
            customerName={
              actions.selectedTransactionForInstallments.customerName ||
              'Walk-in Customer'
            }
          />
        )}

      {actions.showReceiptModal && actions.selectedTransaction && (
        <ReceiptPreviewModal
          transaction={actions.selectedTransaction}
          onClose={actions.closeReceiptModal}
        />
      )}
    </div>
  )
}