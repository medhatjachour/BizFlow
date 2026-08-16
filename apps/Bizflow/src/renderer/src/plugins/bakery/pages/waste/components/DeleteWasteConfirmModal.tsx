import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const DeleteWasteConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useLanguage()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t('bakeryDeleteWasteTitle') || 'Delete Waste Entry'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('bakeryDeleteWasteConfirm') || 'Are you sure you want to delete this waste record? Note: Auto-deducted inventory will not be automatically restored.'}
        </p>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {t('bakeryCancelBtn') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-sm"
          >
            {t('bakeryDeleteBtn') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}