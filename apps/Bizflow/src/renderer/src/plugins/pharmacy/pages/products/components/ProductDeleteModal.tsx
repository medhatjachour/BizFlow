import React from 'react'
import { PharmacyProductItem } from '../types'
import { Button } from '../../components/ui'

interface ProductDeleteModalProps {
  target: PharmacyProductItem
  onClose: () => void
  onConfirm: () => void
  t: (k: string, params?: Record<string, any>) => string
}

export const ProductDeleteModal: React.FC<ProductDeleteModalProps> = ({
  target,
  onClose,
  onConfirm,
  t,
}) => {
  const hasHistory = (target.salesCount ?? 0) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          {t('phDeleteProduct')}?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{target.name}</span>.
          {' '}
          {hasHistory ? t('phPrHistoryDisableNote') : t('phPrDeleteNote')}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            {t('phCancel')}
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>
            {hasHistory ? t('phDisable') : t('phDelete')}
          </Button>
        </div>
      </div>
    </div>
  )
}