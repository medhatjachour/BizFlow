import React from 'react'
import {
  Eye,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SaleTransaction } from '../types'
import { formatDate, getStatusColor } from '../utils'

interface TransactionRowProps {
  transaction: SaleTransaction
  isExpanded: boolean
  refundsEnabled: boolean
  isWithinRefundPeriod: (date: string) => boolean
  refundPeriodDays: number
  onToggleExpand: () => void
  onView: () => void
  onReceipt: () => void
  onInstallments: () => void
  onPartialRefund: () => void
}

export function TransactionRow({
  transaction,
  isExpanded,
  refundsEnabled,
  isWithinRefundPeriod,
  refundPeriodDays,
  onToggleExpand,
  onView,
  onReceipt,
  onInstallments,
  onPartialRefund
}: TransactionRowProps): JSX.Element {
  const { t } = useLanguage()
  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  return (
    <React.Fragment>
      <tr className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800/50 dark:hover:to-transparent transition-all border-b border-slate-100 dark:border-slate-800">
        <td className="px-6 py-4">
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </td>
        <td className="px-6 py-4">
          <span className="font-mono text-sm font-semibold text-primary">
            {transaction.id.slice(0, 8)}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
          {formatDate(transaction.createdAt)}
        </td>
        <td className="px-6 py-4">
          <div className="font-medium text-slate-900 dark:text-white">
            {transaction.customerName || t('walkInCustomer')}
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="text-slate-900 dark:text-white">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="font-bold text-slate-900 dark:text-white">
            ${transaction.total.toFixed(2)}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
            {transaction.paymentMethod}
          </span>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(
              transaction.status
            )}`}
          >
            {transaction.status === 'completed' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {transaction.status === 'partially_refunded' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {transaction.status === 'refunded' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {transaction.status === 'pending' && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {transaction.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={onView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
              title="View transaction details"
            >
              <Eye size={14} />
              View
            </button>
            <button
              onClick={onReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
              title="View receipt"
            >
              <Receipt size={14} />
              Receipt
            </button>
            {transaction.installments &&
              transaction.installments.length > 0 && (
                <button
                  onClick={onInstallments}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
                  title="Manage installments"
                >
                  <CreditCard size={14} />
                  Installments
                </button>
              )}
            {(transaction.status === 'completed' ||
              transaction.status === 'partially_refunded') &&
              refundsEnabled && (
                <>
                  {isWithinRefundPeriod(transaction.createdAt) ? (
                    <button
                      onClick={onPartialRefund}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
                      title={t('processRefund')}
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                      {t('refundItems')}
                    </button>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-not-allowed"
                      title={`Refund period expired (${refundPeriodDays} days)`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
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
                      Expired
                    </div>
                  )}
                </>
              )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr
          key={`${transaction.id}-items`}
          className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-800/10 border-l-4 border-primary"
        >
          <td colSpan={9} className="px-6 py-6">
            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Transaction Items
                </h4>
              </div>
              <div className="grid gap-2">
                {transaction.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.product?.name || 'Unknown Product'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.variant && (
                          <span className="mr-3">
                            SKU: {item.variant.variantSKU}
                            {item.variant.size &&
                              ` | Size: ${item.variant.size}`}
                            {item.variant.color &&
                              ` | Color: ${item.variant.color}`}
                          </span>
                        )}
                        {!item.variant && item.product?.baseSKU && (
                          <span className="mr-3">
                            SKU: {item.product.baseSKU}
                          </span>
                        )}
                      </div>
                      {item.discountReason && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded inline-block">
                          💡 Discount reason: {item.discountReason}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-slate-600 dark:text-slate-400">
                        Qty:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        {item.refundedQuantity != null &&
                          item.refundedQuantity > 0 && (
                            <span className="ml-2 text-red-600 dark:text-red-400 text-xs">
                              (-{item.refundedQuantity} refunded)
                            </span>
                          )}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {item.discountType && item.discountType !== 'NONE' ? (
                          <div className="flex flex-col items-end">
                            <span className="line-through text-xs text-slate-400">
                              @ ${item.price.toFixed(2)}
                            </span>
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              @ ${(item.finalPrice || item.price).toFixed(2)}
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {item.discountType === 'PERCENTAGE'
                                ? `(-${item.discountValue}%)`
                                : `(-$${item.discountValue?.toFixed(2)})`}
                            </span>
                          </div>
                        ) : (
                          <>@ ${item.price.toFixed(2)}</>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white min-w-[80px] text-right">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-6 text-sm">
                <div className="text-slate-600 dark:text-slate-400">
                  Subtotal:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${transaction.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Tax:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${transaction.tax.toFixed(2)}
                  </span>
                </div>
                <div className="text-slate-900 dark:text-white font-bold">
                  Total: ${transaction.total.toFixed(2)}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}