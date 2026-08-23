import React from 'react'
import { PharmacyCustomerItem } from '../types'
import { Button } from '../../components/ui'

interface CustomerDeleteModalProps {
  target: PharmacyCustomerItem
  onClose: () => void
  onConfirm: () => void
  t: (k: string) => string
}

export const CustomerDeleteModal: React.FC<CustomerDeleteModalProps> = ({
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
          {t('phDeleteCustomer') || 'Delete Customer'}?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{target.name}</span>.
          {' '}{t('phSalesKept') || 'Their transaction and sales history will be preserved as Walk-in records.'}
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