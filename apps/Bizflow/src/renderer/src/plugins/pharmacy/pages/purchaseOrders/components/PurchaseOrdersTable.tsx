import React from 'react'
import { PackageCheck, Pencil, Trash2, Loader2 } from 'lucide-react'
import { PurchaseOrderItem } from '../types'
import { money, PO_STATUS_BADGE } from '../../components/_shared'
import { IconButton } from '../../components/ui'

interface PurchaseOrdersTableProps {
  orders: PurchaseOrderItem[]
  loading: boolean
  onReceive: (order: PurchaseOrderItem) => void
  onEdit: (order: PurchaseOrderItem) => void
  onDelete: (order: PurchaseOrderItem) => void
}

export const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  orders,
  loading,
  onReceive,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Loading purchase order log...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-sm font-medium">No purchase orders found</p>
        <p className="text-xs mt-0.5">Click "New Order" above to create an inbound procurement request.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold bg-slate-50/40 dark:bg-slate-900/30">
            <th className="px-4 py-3">PO Number</th>
            <th className="px-4 py-3">Vendor / Supplier</th>
            <th className="px-4 py-3">Order Date</th>
            <th className="px-4 py-3 text-center">Items Count</th>
            <th className="px-4 py-3 text-right">Order Total</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {orders.map(o => (
            <tr
              key={o.id}
              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-slate-700 dark:text-slate-300"
            >
              <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                #{o.orderNumber ?? '—'}
              </td>
              <td className="px-4 py-2.5 font-medium">
                {o.supplier?.name || <span className="text-slate-400 italic">Unassigned</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                {new Date(o.orderDate).toLocaleDateString([], { dateStyle: 'medium' })}
              </td>
              <td className="px-4 py-2.5 text-center text-slate-500 font-semibold">
                {o.itemCount || o.items?.length || 0}
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                ${money(o.total)}
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PO_STATUS_BADGE[o.status] ?? ''}`}>
                  {o.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  {o.status !== 'received' && (
                    <IconButton
                      icon={PackageCheck}
                      tone="emerald"
                      onClick={() => onReceive(o)}
                      title="Receive and verify barcode shipment"
                    />
                  )}
                  {o.status !== 'received' && (
                    <IconButton
                      icon={Pencil}
                      tone="slate"
                      onClick={() => onEdit(o)}
                      title="Edit order"
                    />
                  )}
                  <IconButton
                    icon={Trash2}
                    tone="red"
                    onClick={() => onDelete(o)}
                    title="Delete purchase order"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}