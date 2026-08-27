import React from 'react'
import type { Sale } from '../types'
import { SaleRow } from './SaleRow'

interface Props {
  sales: Sale[]
  onPaid: () => void
  onEditSale: (s: Sale) => void
  onRefundSale: (s: Sale) => void
}

export const IndividualSalesTable: React.FC<Props> = ({
  sales,
  onPaid,
  onEditSale,
  onRefundSale
}) => {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Batch Lot</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Profit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <SaleRow
                key={s.id}
                sale={s}
                onPaid={onPaid}
                onEdit={() => onEditSale(s)}
                onRefund={() => onRefundSale(s)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}