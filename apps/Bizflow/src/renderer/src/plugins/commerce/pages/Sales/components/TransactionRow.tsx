import React from 'react'
import {
  Eye,
  Receipt,
  CreditCard,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SaleTransaction } from '../types'
import { formatDate, getStatusColor } from '../utils'
import { SaleLifecycleControl } from './SaleLifecycleControl'

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
  updating: boolean
  onComplete: () => void
  onReschedule: (delayDays: number) => void
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
  onPartialRefund,
  updating,
  onComplete,
  onReschedule
}: TransactionRowProps): JSX.Element {
  const { t, language, isRtl } = useLanguage()
  const totalItems = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  return (
    <React.Fragment>
      <tr className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors">
        <td className="px-3 py-3">
          <button
            onClick={onToggleExpand}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 inline-flex items-center justify-center transition-colors"
            title={t(isExpanded ? 'salesUiCollapseDetails' : 'salesUiExpandDetails')}
          >
            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} className={isRtl ? 'rotate-180' : ''} />}
          </button>
        </td>
        <td className="px-3 py-3">
          <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-400">
            {transaction.id.slice(0, 8)}
          </span>
        </td>
        <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDate(transaction.createdAt, language === 'ar' ? 'ar' : 'en-US')}
        </td>
        <td className="px-3 py-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-white max-w-[150px] truncate">
            {transaction.customerName || t('walkInCustomer')}
          </div>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
            {totalItems}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
            ${transaction.total.toFixed(2)}
          </span>
        </td>
        <td className="px-3 py-3">
          <span className="text-[11px] text-slate-600 dark:text-slate-300 capitalize">
            {t(transaction.paymentMethod)}
          </span>
        </td>
        <td className="px-3 py-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ${getStatusColor(
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
            {t(transaction.status === 'partially_refunded' ? 'salesUiPartiallyRefunded' : transaction.status)}
          </span>
        </td>
        <td className="px-3 py-3">
  <div className="flex items-center justify-center gap-2 flex-wrap">
            
            <SaleLifecycleControl
              transaction={transaction}
              updating={updating}
              onComplete={onComplete}
              onReschedule={onReschedule}
            />
            <button
              onClick={onView}
              className="w-8 h-8 bg-sky-50 dark:bg-sky-950/30 text-sky-600 hover:bg-sky-100 border border-sky-200 dark:border-sky-900 rounded-md inline-flex items-center justify-center transition-colors"
              title={t('salesUiView')}
            >
              <Eye size={14} />
            </button>
            <button
              onClick={onReceipt}
              className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900 rounded-md inline-flex items-center justify-center transition-colors"
              title={t('salesUiReceipt')}
            >
              <Receipt size={14} />
            </button>
            {transaction.installments &&
              transaction.installments.length > 0 && (
                <button
                  onClick={onInstallments}
                  className="w-8 h-8 bg-violet-50 dark:bg-violet-950/30 text-violet-600 hover:bg-violet-100 border border-violet-200 dark:border-violet-900 rounded-md inline-flex items-center justify-center transition-colors"
                  title={t('salesUiInstallments')}
                >
                  <CreditCard size={14} />
                </button>
              )}
            {(transaction.status === 'completed' ||
              transaction.status === 'partially_refunded') &&
              refundsEnabled && (
                <>
                  {isWithinRefundPeriod(transaction.createdAt) ? (
                    <button
                      onClick={onPartialRefund}
                      className="w-8 h-8 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-md inline-flex items-center justify-center transition-colors"
                      title={t('processRefund')}
                    >
                      <RotateCcw size={14} />
                    </button>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-not-allowed"
                      title={t('salesUiRefundExpired', { days: refundPeriodDays })}
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
                      {t('salesUiExpired')}
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
          className="bg-slate-50/80 dark:bg-slate-800/30"
        >
          <td colSpan={9} className="px-4 py-4">
            <div className="ms-8 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  {t('salesUiTransactionItems')}
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
                        {item.product?.name || t('salesUiUnknownProduct')}
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
                        {t('salesUiQuantity')}:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        {item.refundedQuantity != null &&
                          item.refundedQuantity > 0 && (
                            <span className="ml-2 text-red-600 dark:text-red-400 text-xs">
                              (-{item.refundedQuantity} {t('salesUiRefunded')})
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
                  {t('salesUiSubtotal')}:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${transaction.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {t('salesUiTax')}:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${transaction.tax.toFixed(2)}
                  </span>
                </div>
                <div className="text-slate-900 dark:text-white font-bold">
                  {t('salesUiTotal')}: ${transaction.total.toFixed(2)}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}