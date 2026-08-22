import { Trash2, Loader2 } from 'lucide-react'
import { Program } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface DeleteProgramModalProps {
  target: Program | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteProgramModal({
  target,
  deleting,
  onClose,
  onConfirm
}: DeleteProgramModalProps) {
  const { t } = useLanguage()
  if (!target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Trash2 size={22} />
        </div>

        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Delete "{target.name}"?
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            All configured workout days and exercise logs in this routine will be removed.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('gymCancel') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>{t('gymDelete') || 'Delete Program'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}