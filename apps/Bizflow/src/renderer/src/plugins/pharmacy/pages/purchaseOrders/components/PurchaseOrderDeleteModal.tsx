import React from 'react'
import { PurchaseOrderItem } from '../types'
import { Button } from '../../components/ui'

interface PurchaseOrderDeleteModalProps {
  target: PurchaseOrderItem
  onClose: () => void
  onConfirm: () => void
}

export const PurchaseOrderDeleteModal: React.FC<PurchaseOrderDeleteModalProps> = ({
  target,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          Delete Purchase Order #{target.orderNumber}?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          This action cannot be undone. Any planned stock delivery associated with this PO will be removed.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>
            Delete Order
          </Button>
        </div>
      </div>
    </div>
  )
}