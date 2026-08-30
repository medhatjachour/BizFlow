import React from 'react'
import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../utils'
import type { PurchaseOrderResponseDTO } from '../types'

interface ReceiveOrderModalProps {
  isOpen: boolean
  order: PurchaseOrderResponseDTO | null
  onClose: () => void
  onConfirm: () => Promise<boolean>
}

export const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Receive & Reconcile PO</h4>
            <p className="text-xs text-slate-500">PO Number: {order.poNumber}</p>
          </div>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Executing this action will immediately increment physical inventory stock counts for all item variants listed under this purchase order.
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Supplier:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{order.supplier?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Valuation:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Items Quantity:</span>
            <span className="font-mono">{order.items?.length || 0} line items</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
          >
            Confirm & Stock Up
          </button>
        </div>
      </div>
    </div>
  )
}