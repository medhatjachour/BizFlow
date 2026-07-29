import { useState, useCallback } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'
import type { SaleTransaction } from '../types'
import { getRefundPeriodDays, isWithinRefundPeriod } from '../utils'

export function useSalesActions(reloadTransactions: () => Promise<void>) {
  const { showToast } = useToast()
  const { t } = useLanguage()
  const [selectedTransaction, setSelectedTransaction] =
    useState<SaleTransaction | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showInstallmentManager, setShowInstallmentManager] = useState(false)
  const [selectedTransactionForInstallments, setSelectedTransactionForInstallments] =
    useState<SaleTransaction | null>(null)

  const refundPeriodDays = getRefundPeriodDays()
  const refundsEnabled = refundPeriodDays > 0

  const handleRefund = useCallback(
    async (transactionId: string) => {
      if (
        !confirm(
          'Are you sure you want to refund this entire transaction? Stock will be restored for all items.'
        )
      ) {
        return
      }

      try {
        const result = await ipc.saleTransactions.refund(transactionId)
        if (result.success) {
          alert('Transaction refunded successfully! Stock has been restored.')
          await reloadTransactions()
        } else {
          alert('Failed to refund transaction: ' + result.message)
        }
      } catch (error) {
        logger.error('Failed to refund transaction:', error)
        alert('Failed to process refund. Please try again.')
      }
    },
    [reloadTransactions]
  )

  const handlePartialRefund = useCallback((transaction: SaleTransaction) => {
    setSelectedTransaction(transaction)
    setShowRefundModal(true)
  }, [])

  const handleRefundItems = useCallback(
    async (
      items: Array<{ saleItemId: string; quantityToRefund: number }>
    ) => {
      if (!selectedTransaction) return

      try {
        const result = await ipc.saleTransactions.refundItems({
          transactionId: selectedTransaction.id,
          items
        })

        if (result.success) {
          showToast('success', t('itemsRefundedSuccess'))
          await reloadTransactions()
          setShowRefundModal(false)
        } else {
          throw new Error(result.error || t('failedToRefundItems'))
        }
      } catch (error: unknown) {
        logger.error('Failed to refund items:', error)
        const message =
          error instanceof Error ? error.message : t('failedToRefundItems')
        showToast('error', message)
      }
    },
    [selectedTransaction, showToast, t, reloadTransactions]
  )

  const handleViewTransaction = useCallback((transaction: SaleTransaction) => {
    setSelectedTransaction(transaction)
    setShowViewModal(true)
  }, [])

  const handleInstallmentManager = useCallback(
    (transaction: SaleTransaction) => {
      setSelectedTransactionForInstallments(transaction)
      setShowInstallmentManager(true)
    },
    []
  )

  const handleViewReceipt = useCallback((transaction: SaleTransaction) => {
    setSelectedTransaction(transaction)
    setShowReceiptModal(true)
  }, [])

  const closeViewModal = useCallback(() => setShowViewModal(false), [])
  const closeRefundModal = useCallback(() => setShowRefundModal(false), [])
  const closeReceiptModal = useCallback(() => {
    setShowReceiptModal(false)
    setSelectedTransaction(null)
  }, [])
  const closeInstallmentManager = useCallback(() => {
    setShowInstallmentManager(false)
    setSelectedTransactionForInstallments(null)
  }, [])

  return {
    selectedTransaction,
    showViewModal,
    showRefundModal,
    showReceiptModal,
    showInstallmentManager,
    selectedTransactionForInstallments,
    refundPeriodDays,
    refundsEnabled,
    isWithinRefundPeriod: (date: string) =>
      isWithinRefundPeriod(date, refundPeriodDays),
    handleRefund,
    handlePartialRefund,
    handleRefundItems,
    handleViewTransaction,
    handleInstallmentManager,
    handleViewReceipt,
    closeViewModal,
    closeRefundModal,
    closeReceiptModal,
    closeInstallmentManager
  }
}