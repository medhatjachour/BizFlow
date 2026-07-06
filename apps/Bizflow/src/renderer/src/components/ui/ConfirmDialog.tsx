import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import { useLanguage } from '../../contexts/LanguageContext'

type ConfirmDialogProps = {
  isOpen: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable in-app confirmation dialog — a consistent replacement for window.confirm().
 * Defaults to a destructive (danger) style with a warning icon.
 */
export default function ConfirmDialog({
  isOpen, title, message, confirmLabel, cancelLabel,
  danger = true, busy = false, onConfirm, onCancel,
}: Readonly<ConfirmDialogProps>): JSX.Element | null {
  const { t } = useLanguage()
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title ?? (t('confirm') ?? 'Confirm')} size="sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <AlertTriangle className={danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} size={20} />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1.5 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {cancelLabel ?? (t('cancel') ?? 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
          >
            {confirmLabel ?? (t('delete') ?? 'Delete')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
