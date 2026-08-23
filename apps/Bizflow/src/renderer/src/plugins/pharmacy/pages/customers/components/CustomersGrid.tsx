import React from 'react'
import { Pencil, Trash2, Percent, Users, Loader2 } from 'lucide-react'
import { PharmacyCustomerItem } from '../types'
import { money, int } from '../../components/_shared'

interface CustomersGridProps {
  customers: PharmacyCustomerItem[]
  loading: boolean
  onSelectCustomer: (id: string) => void
  onEdit: (c: PharmacyCustomerItem) => void
  onDelete: (c: PharmacyCustomerItem) => void
  t: (k: string) => string
}

export const CustomersGrid: React.FC<CustomersGridProps> = ({
  customers,
  loading,
  onSelectCustomer,
  onEdit,
  onDelete,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Loading customer directory...</p>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Users size={36} className="mb-2 opacity-30" />
        <p className="text-sm font-medium">{t('phNoCustomers') || 'No customers registered yet'}</p>
        <p className="text-xs mt-0.5">Click "Add Customer" above to start linking sales and managing balances.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {customers.map(c => {
        const hasDebt = (c.outstanding || 0) > 0.005

        return (
          <div
            key={c.id}
            onClick={() => onSelectCustomer(c.id)}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm border border-emerald-200/50 dark:border-emerald-900/50">
                    {(c.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.2">
                      {c.phone || (t('phNoPhone') || 'No phone recorded')}
                    </p>
                  </div>
                </div>

                {/* Hover Actions */}
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => onEdit(c)}
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                    title="Edit profile"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Delete customer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="mt-3.5 grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{int(c.salesCount)}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Orders</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${money(c.totalSpent)}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Spent</p>
                </div>
                <div>
                  <p className={`text-xs font-bold ${hasDebt ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                    ${money(c.outstanding)}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">Due</p>
                </div>
              </div>
            </div>

            {/* Discount Badge */}
            {(c.defaultDiscount ?? 0) > 0 && (
              <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                <Percent size={10} />
                <span>{c.defaultDiscount}% default discount</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}