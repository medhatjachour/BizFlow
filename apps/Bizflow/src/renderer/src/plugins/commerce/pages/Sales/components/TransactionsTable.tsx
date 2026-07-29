import { Calendar, Users } from 'lucide-react'
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
  onPartialRefund
}: TransactionsTableProps): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Recent Transactions
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border-b-2 border-primary/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-12" />
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('saleId')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  {t('saleDate')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  {t('customer')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('itemCount')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('totalAmount')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('payment')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                      {t('loading')}...
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <p className="text-slate-600 dark:text-slate-400">
                    {transactions.length === 0
                      ? 'No transactions yet. Complete a sale in the POS to see it here!'
                      : 'No transactions match your search or filter criteria.'}
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
    </div>
  )
}