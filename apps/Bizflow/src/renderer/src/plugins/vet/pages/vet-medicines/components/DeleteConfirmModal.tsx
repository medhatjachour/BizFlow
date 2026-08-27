
import React from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DeleteConfirmModalProps {
  label: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  label,
  busy,
  onConfirm,
  onCancel
}) => {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('vetDeletePermanent') || 'This action cannot be undone.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
          >
            {t('vetMedCancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetDeleteConfirm') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}