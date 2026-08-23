import React from 'react'
import { PharmacySupplierItem } from '../types'
import { Button } from '../../components/ui'

interface SupplierDeleteModalProps {
  target: PharmacySupplierItem
  onClose: () => void
  onConfirm: () => void
  t: (k: string) => string
}

export const SupplierDeleteModal: React.FC<SupplierDeleteModalProps> = ({
  target,
  onClose,
  onConfirm,
  t,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          {t('phDeleteSupplier') || 'Delete Supplier'}?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{target.name}</span>.
          {' '}Historic purchase orders and stock batch links will remain intact.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}