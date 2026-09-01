import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { InstallmentManager } from '@renderer/components/InstallmentManager'
import type { SalesTab } from './types'
import {
  useSalesTransactions,
  useInstallments,
  useSalesActions,
  useSaleCompletion
} from './hooks'
import {
  StatsCards,
  SalesFilters,
  InstallmentsFilters,
  EmptySalesState,
  TransactionsTable,
  InstallmentsTable,
  TransactionViewModal,
  SalesToolbar
} from './components'
import RefundItemsModal from './components/RefundItemsModal'
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal'

export default function Sales(): JSX.Element {
  const location = useLocation()
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
  const completion = useSaleCompletion(sales.loadTransactions)
  const pendingCount = sales.transactions.filter(
    (transaction) => transaction.status === 'pending'
  ).length

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-100/70 dark:bg-slate-950">
      <SalesToolbar
        activeTab={activeTab}
        loading={activeTab === 'sales' ? sales.loading : installments.loading}
        pendingCount={pendingCount}
        defaultDelayDays={completion.defaultDelayDays}
        onTabChange={setActiveTab}
        onRefresh={activeTab === 'sales' ? sales.loadTransactions : () => void installments.loadInstallments(1)}
        onExport={activeTab === 'sales' ? sales.handleExport : installments.handleExport}
        onDefaultDelayChange={completion.updateDefaultDelay}
      />

      <main className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 space-y-3">

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
              updatingSaleIds={completion.updatingIds}
              onComplete={completion.completeNow}
              onReschedule={completion.reschedule}
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
      </main>
    </div>
  )
}