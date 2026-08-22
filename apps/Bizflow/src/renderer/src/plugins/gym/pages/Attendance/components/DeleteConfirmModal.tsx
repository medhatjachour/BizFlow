import { Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Session } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DeleteConfirmModalProps {
  target: Session | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({ target, deleting, onClose, onConfirm }: DeleteConfirmModalProps) {
  const { t } = useLanguage()
  if (!target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('gymRemoveCheckin') || 'Delete Check-In Record'}
            </h3>
            <p className="text-xs text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t('gymRemoveCheckinConfirm') ||
            'Are you sure you want to remove this visit record? Any associated transaction logs may be removed.'}
        </p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
          >
            {t('gymCancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            <span>{t('gymRemove') || 'Delete Record'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}