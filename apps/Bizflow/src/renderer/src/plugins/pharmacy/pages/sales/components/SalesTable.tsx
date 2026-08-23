import React from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { PharmacySale } from '../types'
import { money, PAY_BADGE, SALE_STATUS_BADGE } from '../../components/_shared'
import { computeOutstanding } from '../utils'

interface SalesTableProps {
  sales: PharmacySale[]
  loading: boolean
  onSelectSale: (sale: PharmacySale) => void
  t: (k: string) => string
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, loading, onSelectSale, t }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Loading sales history...</p>
      </div>
    )
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm font-medium">{t('phNoSales') || 'No sales transactions found'}</p>
        <p className="text-xs mt-0.5">Try altering the search or status filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold bg-slate-50/40 dark:bg-slate-900/30">
            <th className="px-4 py-3">Sale #</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3 text-center">Items</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-center">Payment</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {sales.map(s => {
            const outstanding = computeOutstanding(s)
            return (
              <tr
                key={s.id}
                onClick={() => onSelectSale(s)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
              >
                <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                  #{s.saleNumber ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                  {new Date(s.saleDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-2.5 font-medium">
                  {s.customerName || <span className="text-slate-400 italic">Walk-in</span>}
                </td>
                <td className="px-4 py-2.5 text-center text-slate-500">
                  {s.items?.length ?? 0}
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                  ${money(s.total)}
                  {outstanding > 0.005 && (
                    <span className="block text-[10px] text-red-500 font-semibold">
                      -${money(outstanding)} due
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PAY_BADGE[s.paymentStatus] ?? PAY_BADGE.unpaid}`}>
                    {s.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SALE_STATUS_BADGE[s.status] ?? ''}`}>
                    {(s.status || '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}