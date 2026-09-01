import { RefreshCcw, CheckCircle } from 'lucide-react'
import Pagination from '@renderer/components/Pagination'
import { useLanguage } from '@renderer/contexts/LanguageContext'
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
  const { t } = useLanguage()

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white">{t('salesUiInstallments')}</h2>
        <p className="text-[10px] text-slate-500">{t('salesUiInstallmentsDescription')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <tr className="text-[9px] font-bold uppercase text-slate-500">
              <th className="px-4 py-2.5">
                {t('salesUiCustomer')}
              </th>
              <th className="px-4 py-2.5 text-right">
                {t('salesUiAmount')}
              </th>
              <th className="px-4 py-2.5">
                {t('salesUiDueDate')}
              </th>
              <th className="px-4 py-2.5">
                {t('salesUiStatus')}
              </th>
              <th className="px-4 py-2.5">
                {t('salesUiPaidDate')}
              </th>
              <th className="px-4 py-2.5">
                {t('salesUiSaleId')}
              </th>
              <th className="px-4 py-2.5">
                {t('salesUiActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <RefreshCcw
                      size={24}
                      className="animate-spin text-slate-400 mr-2"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('salesUiLoadingInstallments')}
                    </span>
                  </div>
                </td>
              </tr>
            ) : installments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-slate-500 dark:text-slate-400">
                    {t('salesUiNoInstallments')}
                  </div>
                </td>
              </tr>
            ) : (
              installments.map((installment) => (
                <tr
                  key={installment.id}
                  className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {installment.customer?.name || t('salesUiUnknownCustomer')}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-xs tabular-nums text-slate-900 dark:text-white font-bold">
                      ${installment.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(installment.dueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        installment.status === 'paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : installment.status === 'overdue'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {t(`salesUi${installment.status.charAt(0).toUpperCase()}${installment.status.slice(1)}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {installment.paidDate
                        ? new Date(installment.paidDate).toLocaleDateString()
                        : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {installment.saleId
                        ? installment.saleId.slice(-8)
                        : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {installment.status !== 'paid' && (
                      <button
                        onClick={() => onMarkAsPaid(installment.id)}
                        className="h-8 px-3 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1.5 text-[10px] font-bold transition-colors"
                      >
                        <CheckCircle size={13} />
                        {t('salesUiMarkPaid')}
                      </button>
                    )}
                    {installment.status === 'paid' && (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                        {t('salesUiPaid')}
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
        <div className="border-t border-slate-100 dark:border-slate-800">
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
    </section>
  )
}