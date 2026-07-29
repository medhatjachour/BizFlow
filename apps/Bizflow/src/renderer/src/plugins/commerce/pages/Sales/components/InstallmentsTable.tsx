import { RefreshCcw, CheckCircle } from 'lucide-react'
import Pagination from '@renderer/components/Pagination'
import type { Installment } from '../types'
import { INSTALLMENT_ITEMS_PER_PAGE } from '../constants'

interface InstallmentsTableProps {
  loading: boolean
  installments: Installment[]
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  onMarkAsPaid: (id: string) => void
}

export function InstallmentsTable({
  loading,
  installments,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onMarkAsPaid
}: InstallmentsTableProps): JSX.Element {
  return (
    <div className="glass-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Paid Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Sale ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <RefreshCcw
                      size={24}
                      className="animate-spin text-slate-400 mr-2"
                    />
                    <span className="text-slate-500 dark:text-slate-400">
                      Loading installments...
                    </span>
                  </div>
                </td>
              </tr>
            ) : installments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-slate-500 dark:text-slate-400">
                    No installments found
                  </div>
                </td>
              </tr>
            ) : (
              installments.map((installment) => (
                <tr
                  key={installment.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {installment.customer?.name || 'Unknown Customer'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white font-semibold">
                      ${installment.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(installment.dueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        installment.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : installment.status === 'overdue'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {installment.status.charAt(0).toUpperCase() +
                        installment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {installment.paidDate
                        ? new Date(installment.paidDate).toLocaleDateString()
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {installment.saleId
                        ? installment.saleId.slice(-8)
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {installment.status !== 'paid' && (
                      <button
                        onClick={() => onMarkAsPaid(installment.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Mark Paid
                      </button>
                    )}
                    {installment.status === 'paid' && (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                        ✓ Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={totalItems}
            itemsPerPage={INSTALLMENT_ITEMS_PER_PAGE}
            itemName="installments"
          />
        </div>
      )}
    </div>
  )
}