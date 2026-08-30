import React from 'react'
import { Edit3, Power, Package, Phone, Mail, User, CreditCard } from 'lucide-react'
import { formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { SupplierResponseDTO } from '../types'

interface SuppliersTableProps {
  suppliers: SupplierResponseDTO[]
  loading: boolean
  onEdit: (supplier: SupplierResponseDTO) => void
  onToggleStatus: (supplier: SupplierResponseDTO) => void
  onViewProducts: (supplier: SupplierResponseDTO) => void
  onOpenCreatePO: (supplierId: string) => void
}

export const SuppliersTable: React.FC<SuppliersTableProps> = ({
  suppliers,
  loading,
  onEdit,
  onToggleStatus,
  onViewProducts,
  onOpenCreatePO
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">Loading catalog partners...</span>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Package className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No suppliers registered</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Start building your supply chain by registering vendor relationships, cost price matrices, and purchase orders.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="px-4 py-3 text-start">{t('supplierName') || 'Supplier / Organization'}</th>
              <th className="px-4 py-3 text-start">{t('contactInfo') || 'Contact Person & Channels'}</th>
              <th className="px-4 py-3 text-center">{t('linkedProducts') || 'SKU Catalog'}</th>
              <th className="px-4 py-3 text-center">{t('orders') || 'Orders'}</th>
              <th className="px-4 py-3 text-end">{t('totalPurchased') || 'Total Invoiced'}</th>
              <th className="px-4 py-3 text-center">{t('status') || 'Status'}</th>
              <th className="px-4 py-3 text-end">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Supplier info */}
                <td className="px-4 py-3 text-start align-middle">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{supplier.name}</span>
                    {supplier.paymentTerms && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {supplier.paymentTerms}
                      </span>
                    )}
                  </div>
                  {supplier.address && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-xs">
                      {supplier.address}
                    </div>
                  )}
                </td>

                {/* Contact details */}
                <td className="px-4 py-3 text-start align-middle">
                  <div className="space-y-1">
                    {supplier.contactName && (
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{supplier.contactName}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {supplier.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span dir="ltr">{supplier.phone}</span>
                        </span>
                      )}
                      {supplier.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" />
                          <span>{supplier.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Products Badge */}
                <td className="px-4 py-3 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onViewProducts(supplier)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors font-medium text-[11px]"
                  >
                    <Package className="w-3 h-3" />
                    <span>{supplier.productCount || 0} items</span>
                  </button>
                </td>

                {/* Total Orders */}
                <td className="px-4 py-3 text-center align-middle font-mono font-medium text-slate-700 dark:text-slate-300">
                  {supplier.totalPurchaseOrders || 0}
                </td>

                {/* Total Spend */}
                <td className="px-4 py-3 text-end align-middle font-mono font-bold text-slate-900 dark:text-emerald-400">
                  {formatCurrency(supplier.totalPurchased || 0)}
                </td>

                {/* Status Toggle Badge */}
                <td className="px-4 py-3 text-center align-middle">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      supplier.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        supplier.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    {supplier.isActive ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}
                  </span>
                </td>

                {/* Quick actions */}
                <td className="px-4 py-3 text-end align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenCreatePO(supplier.id)}
                      className="p-1.5 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 transition-all"
                      title="Create PO from Supplier"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(supplier)}
                      className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Edit Supplier details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(supplier)}
                      className={`p-1.5 rounded-md transition-all ${
                        supplier.isActive
                          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                      }`}
                      title={supplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}