import Pagination from '@renderer/components/Pagination'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SaleTransaction } from '../types'
import { ITEMS_PER_PAGE } from '../constants'
import { TransactionRow } from './TransactionRow'

interface TransactionsTableProps {
  loading: boolean
  transactions: SaleTransaction[]
  filteredTransactions: SaleTransaction[]
  paginatedTransactions: SaleTransaction[]
  expandedTransactions: Set<string>
  currentPage: number
  totalPages: number
  refundsEnabled: boolean
  isWithinRefundPeriod: (date: string) => boolean
  refundPeriodDays: number
  onPageChange: (page: number) => void
  onToggleExpand: (id: string) => void
  onView: (t: SaleTransaction) => void
  onReceipt: (t: SaleTransaction) => void
  onInstallments: (t: SaleTransaction) => void
  onPartialRefund: (t: SaleTransaction) => void
  updatingSaleIds: Set<string>
  onComplete: (id: string) => void
  onReschedule: (id: string, delayDays: number) => void
}

export function TransactionsTable({
  loading,
  transactions,
  filteredTransactions,
  paginatedTransactions,
  expandedTransactions,
  currentPage,
  totalPages,
  refundsEnabled,
  isWithinRefundPeriod,
  refundPeriodDays,
  onPageChange,
  onToggleExpand,
  onView,
  onReceipt,
  onInstallments,
  onPartialRefund,
  updatingSaleIds,
  onComplete,
  onReschedule
}: TransactionsTableProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">{t('salesUiRecentTransactions')}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('salesUiRecentTransactionsDescription')}</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">{filteredTransactions.length} {t(filteredTransactions.length === 1 ? 'salesUiTransaction' : 'salesUiTransactions')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr className="text-[9px] font-bold text-slate-500 uppercase">
              <th className="px-3 py-2.5 w-10" />
              <th className="px-3 py-2.5">
                {t('salesUiSaleId')}
              </th>
              <th className="px-3 py-2.5">
                {t('salesUiDate')}
              </th>
              <th className="px-3 py-2.5">
                {t('salesUiCustomer')}
              </th>
              <th className="px-3 py-2.5 text-right">
                {t('salesUiItems')}
              </th>
              <th className="px-3 py-2.5 text-right">
                {t('salesUiTotal')}
              </th>
              <th className="px-3 py-2.5">
                {t('salesUiPayment')}
              </th>
              <th className="px-3 py-2.5">
                {t('salesUiStatus')}
              </th>
              <th className="px-3 py-2.5 min-w-[300px]">
                {t('salesUiActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-slate-200 border-t-emerald-500 mb-3" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('loading')}...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {transactions.length === 0
                      ? t('salesUiNoTransactions')
                      : t('salesUiNoMatches')}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isExpanded={expandedTransactions.has(transaction.id)}
                  refundsEnabled={refundsEnabled}
                  isWithinRefundPeriod={isWithinRefundPeriod}
                  refundPeriodDays={refundPeriodDays}
                  onToggleExpand={() => onToggleExpand(transaction.id)}
                  onView={() => onView(transaction)}
                  onReceipt={() => onReceipt(transaction)}
                  onInstallments={() => onInstallments(transaction)}
                  onPartialRefund={() => onPartialRefund(transaction)}
                  updating={updatingSaleIds.has(transaction.id)}
                  onComplete={() => onComplete(transaction.id)}
                  onReschedule={(delayDays) => onReschedule(transaction.id, delayDays)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        totalItems={filteredTransactions.length}
        itemsPerPage={ITEMS_PER_PAGE}
        itemName="transactions"
      />
    </section>
  )
}