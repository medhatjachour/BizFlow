import React from 'react'
import { ShoppingCart, CheckCircle2, Truck, Trash2, Eye, Plus, Search, RotateCcw } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils'
import { PO_STATUS_CONFIG } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { PurchaseOrderResponseDTO, PurchaseOrderFilterState, POStatus } from '../types'

interface PurchaseOrdersTableProps {
  orders: PurchaseOrderResponseDTO[]
  loading: boolean
  filters: PurchaseOrderFilterState
  setFilters: React.Dispatch<React.SetStateAction<PurchaseOrderFilterState>>
  onOpenCreatePO: () => void
  onReceivePO: (order: PurchaseOrderResponseDTO) => void
  onUpdateStatus: (orderId: string, status: POStatus) => void
  onDeletePO: (orderId: string) => void
  onRefresh: () => void
}

export const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  orders,
  loading,
  filters,
  setFilters,
  onOpenCreatePO,
  onReceivePO,
  onUpdateStatus,
  onDeletePO,
  onRefresh
}) => {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchSuppliersPlaceholder') || 'Search by PO# or Supplier Name...'}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t('allStatus') || 'All Statuses'}</option>
            <option value="draft">{t('draft') || 'Drafts Only'}</option>
            <option value="ordered">{t('ordered') || 'Ordered (In Transit)'}</option>
            <option value="received">{t('received') || 'Received (Reconciled)'}</option>
            <option value="cancelled">{t('cancelled') || 'Cancelled'}</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            title={t('refresh') || 'Refresh Invoices'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreatePO}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newPurchaseOrder') || 'New Purchase Order'}</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="px-4 py-3 text-start">{t('poIdentifier') || 'PO Identifier'}</th>
                <th className="px-4 py-3 text-start">{t('supplierPartner') || 'Supplier Partner'}</th>
                <th className="px-4 py-3 text-center">{t('status') || 'Status'}</th>
                <th className="px-4 py-3 text-start">{t('created') || 'Created'}</th>
                <th className="px-4 py-3 text-start">{t('expectedETA') || 'Expected ETA'}</th>
                <th className="px-4 py-3 text-end">{t('totalAmount') || 'Total Amount'}</th>
                <th className="px-4 py-3 text-end">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {orders.map((po) => {
                const statusStyle = PO_STATUS_CONFIG[po.status as POStatus] || PO_STATUS_CONFIG.draft
                return (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-4 py-3 text-start align-middle font-mono font-bold text-slate-900 dark:text-white">
                      {po.poNumber}
                    </td>
                    <td className="px-4 py-3 text-start align-middle font-medium text-slate-800 dark:text-slate-200">
                      {po.supplier?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`} />
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-start align-middle text-slate-500 dark:text-slate-400">
                      {formatDate(po.orderDate)}
                    </td>
                    <td className="px-4 py-3 text-start align-middle text-slate-500 dark:text-slate-400">
                      {formatDate(po.expectedDate)}
                    </td>
                    <td className="px-4 py-3 text-end align-middle font-mono font-bold text-slate-900 dark:text-emerald-400">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-end align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status === 'draft' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(po.id, 'ordered')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                              title="Mark as ordered / In Transit"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{t('dispatch') || 'Dispatch'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePO(po.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {po.status === 'ordered' && (
                          <button
                            type="button"
                            onClick={() => onReceivePO(po)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 shadow-2xs transition-all active:scale-95"
                            title={t('reconcileAndAcceptInventory') || 'Reconcile and accept inventory'}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t('receiveOrder') || 'Receive Order'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {orders.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-400 text-xs">
              {t('noPurchaseOrdersFound') || 'No purchase orders found matching the filter criteria.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}