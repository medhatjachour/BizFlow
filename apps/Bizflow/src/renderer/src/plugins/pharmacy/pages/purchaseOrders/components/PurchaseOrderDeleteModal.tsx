import React from 'react'
import { PurchaseOrderItem } from '../types'
import { Button } from '../../components/ui'
import { useLanguage } from '@renderer/contexts/LanguageContext'

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
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          {t('phPoDeleteTitle', { number: target.orderNumber })}?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {t('phPoDeleteBody')}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            {t('phCancel')}
          </Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onConfirm}>
            {t('phPoDeleteOrder')}
          </Button>
        </div>
      </div>
    </div>
  )
}