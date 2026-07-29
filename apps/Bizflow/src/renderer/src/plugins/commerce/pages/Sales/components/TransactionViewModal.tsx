import { X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SaleTransaction } from '../types'
import { formatDate, getStatusColor } from '../utils'

interface TransactionViewModalProps {
  transaction: SaleTransaction
  refundsEnabled: boolean
  isWithinRefundPeriod: (date: string) => boolean
  refundPeriodDays: number
  onClose: () => void
  onPartialRefund: () => void
  onFullRefund: () => void
}

export function TransactionViewModal({
  transaction,
  refundsEnabled,
  isWithinRefundPeriod,
  refundPeriodDays,
  onClose,
  onPartialRefund,
  onFullRefund
}: TransactionViewModalProps): JSX.Element {
  const { t } = useLanguage()

  const totalRefunded = transaction.items.reduce((sum, item) => {
    const refunded = item.refundedQuantity || 0
    return sum + refunded * item.price
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('transactionDetails')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {t('transactionId')}
              </p>
              <p className="font-mono font-bold text-primary">
                {transaction.id}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {t('statusLabel')}
              </p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                  transaction.status
                )}`}
              >
                {transaction.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {t('dateAndTime')}
            </p>
            <p className="font-medium text-slate-900 dark:text-white">
              {formatDate(transaction.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {t('customerLabel')}
            </p>
            <p className="font-medium text-slate-900 dark:text-white">
              {transaction.customerName || t('walkInCustomer')}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {t('soldByLabel')}
            </p>
            <p className="font-medium text-slate-900 dark:text-white">
              {transaction.user?.username || t('unknownUser')}
            </p>
          </div>

          {/* Items */}
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {t('itemsLabel')}
            </p>
            <div className="space-y-2">
              {transaction.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {item.product?.name || t('unknownProduct')}
                      </p>
                      {item.variant && (
                        <p className="text-xs text-slate-500 mt-1">
                          SKU: {item.variant.variantSKU}
                          {item.variant.size &&
                            ` | Size: ${item.variant.size}`}
                          {item.variant.color &&
                            ` | Color: ${item.variant.color}`}
                        </p>
                      )}
                      {!item.variant && item.product?.baseSKU && (
                        <p className="text-xs text-slate-500 mt-1">
                          SKU: {item.product.baseSKU}
                        </p>
                      )}
                      {item.product?.category && (
                        <p className="text-xs text-slate-500 mt-1">
                          {t('categoryLabel')}:{' '}
                          {typeof item.product.category === 'string'
                            ? item.product.category
                            : item.product.category?.name ||
                              t('uncategorized')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-slate-600 dark:text-slate-400">
                      <div>
                        {t('quantityLabel')}:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                      </div>
                      {item.refundedQuantity != null &&
                        item.refundedQuantity > 0 && (
                          <div className="mt-1 space-y-0.5">
                            <div className="text-red-600 dark:text-red-400 text-xs">
                              {t('refundedLabel')}: {item.refundedQuantity}{' '}
                              {item.refundedQuantity > 1
                                ? t('unitsLabel')
                                : t('unitLabel')}
                            </div>
                            <div className="text-green-600 dark:text-green-400 text-xs">
                              {t('activeLabel')}:{' '}
                              {item.quantity - item.refundedQuantity}{' '}
                              {item.quantity - item.refundedQuantity > 1
                                ? t('unitsLabel')
                                : t('unitLabel')}
                            </div>
                            {item.refundedAt && (
                              <div className="text-xs text-slate-500">
                                {t('refundedOn')}:{' '}
                                {new Date(
                                  item.refundedAt
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {item.discountType && item.discountType !== 'NONE' ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-xs text-slate-400">
                            {t('originalPrice')}: ${item.price.toFixed(2)}
                          </span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {t('priceLabel')}: $
                            {(item.finalPrice || item.price).toFixed(2)}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {item.discountType === 'PERCENTAGE'
                              ? `${t('discountLabel')}: -${item.discountValue}%`
                              : `${t('discountLabel')}: -$${item.discountValue?.toFixed(2)}`}
                          </span>
                        </div>
                      ) : (
                        <>
                          {t('priceLabel')}:{' '}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ${item.price.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        ${item.total.toFixed(2)}
                      </div>
                      {item.refundedQuantity != null &&
                        item.refundedQuantity > 0 && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            -$
                            {(item.refundedQuantity * item.price).toFixed(2)}{' '}
                            refunded
                          </div>
                        )}
                    </div>
                  </div>
                  {item.discountReason && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
                        <span className="font-semibold">
                          💡 {t('discountReason')}:
                        </span>{' '}
                        {item.discountReason}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Deposits */}
          {transaction.deposits && transaction.deposits.length > 0 && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {t('deposits')}
              </p>
              <div className="space-y-2">
                {transaction.deposits.map((deposit, idx) => (
                  <div
                    key={deposit.id || idx}
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-100">
                          {t('deposit')} #{deposit.id}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {t('dateLabel')}:{' '}
                          {new Date(deposit.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-900 dark:text-green-100">
                          ${deposit.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 mt-1 capitalize">
                          {deposit.status || 'completed'}
                        </div>
                      </div>
                    </div>
                    {deposit.note && (
                      <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                        <div className="text-xs text-green-700 dark:text-green-300">
                          <span className="font-semibold">{t('notes')}:</span>{' '}
                          {deposit.note}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installments */}
          {transaction.installments &&
            transaction.installments.length > 0 && (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {t('installments')}
                </p>
                <div className="space-y-2">
                  {transaction.installments.map((installment, idx) => (
                    <div
                      key={installment.id || idx}
                      className={`border rounded-lg p-4 ${
                        installment.status === 'paid'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : installment.status === 'overdue'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              installment.status === 'paid'
                                ? 'text-green-900 dark:text-green-100'
                                : installment.status === 'overdue'
                                  ? 'text-red-900 dark:text-red-100'
                                  : 'text-blue-900 dark:text-blue-100'
                            }`}
                          >
                            {t('installment')}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              installment.status === 'paid'
                                ? 'text-green-700 dark:text-green-300'
                                : installment.status === 'overdue'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {t('dueDate')}:{' '}
                            {new Date(installment.dueDate).toLocaleDateString()}
                          </p>
                          {installment.paidDate && (
                            <p
                              className={`text-xs ${
                                installment.status === 'paid'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {t('paidOn')}:{' '}
                              {new Date(
                                installment.paidDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-bold ${
                              installment.status === 'paid'
                                ? 'text-green-900 dark:text-green-100'
                                : installment.status === 'overdue'
                                  ? 'text-red-900 dark:text-red-100'
                                  : 'text-blue-900 dark:text-blue-100'
                            }`}
                          >
                            ${installment.amount.toFixed(2)}
                          </div>
                          <div
                            className={`text-xs mt-1 capitalize font-semibold ${
                              installment.status === 'paid'
                                ? 'text-green-700 dark:text-green-300'
                                : installment.status === 'overdue'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {installment.status}
                          </div>
                        </div>
                      </div>
                      {installment.note && (
                        <div
                          className={`mt-3 pt-3 border-t ${
                            installment.status === 'paid'
                              ? 'border-green-200 dark:border-green-700'
                              : installment.status === 'overdue'
                                ? 'border-red-200 dark:border-red-700'
                                : 'border-blue-200 dark:border-blue-700'
                          }`}
                        >
                          <div
                            className={`text-xs ${
                              installment.status === 'paid'
                                ? 'text-green-700 dark:text-green-300'
                                : installment.status === 'overdue'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            <span className="font-semibold">{t('notes')}:</span>{' '}
                            {installment.note}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {t('subtotalLabel')}:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${transaction.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {t('taxLabel')}:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${transaction.tax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {t('paymentMethodLabel')}:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {transaction.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {t('originalTotal')}:
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                ${transaction.total.toFixed(2)}
              </span>
            </div>
            {totalRefunded > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {t('lessRefundedAmount')}
                  </span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    -${totalRefunded.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t-2 border-primary/30">
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {t('netTotal')}
                    <span className="text-xs font-normal text-slate-500">
                      ({t('afterRefunds')})
                    </span>
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${(transaction.total - totalRefunded).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {(transaction.status === 'completed' ||
              transaction.status === 'partially_refunded') && (
              <>
                {!refundsEnabled ? (
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-slate-500 dark:text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('refundsDisabled')}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('refundsDisabledMessage')}
                    </p>
                  </div>
                ) : isWithinRefundPeriod(transaction.createdAt) ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-5 h-5 text-amber-600 dark:text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {t('refundOptions')}
                      </h4>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                      {t('refundOptionsMessage')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={onPartialRefund}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-orange-500 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors font-medium text-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        {t('refundItems')}
                      </button>
                      <button
                        onClick={onFullRefund}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
                          />
                        </svg>
                        {t('refundAll')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-5 h-5 text-slate-500 dark:text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {t('refundPeriodExpired')}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('refundPeriodExpiredMessage').replace(
                        '{days}',
                        String(refundPeriodDays)
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              {t('closeButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}