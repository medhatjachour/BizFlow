import { Clock, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  onOpenShift: () => void
}

export function EmptyState({ onOpenShift }: Props) {
  const { t } = useLanguage()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 mb-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
        <Clock size={28} className="text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
        {t('cfNoActiveShift') || 'No Active Shift'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        {t('cfOpenNewShiftDescription') || 'Open a shift to start taking orders and tracking sales. All transactions will be linked to this shift session.'}
      </p>
      <button
        onClick={onOpenShift}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
      >
        <Plus size={16} />
        {t('cfOpenNewShift') || 'Open Shift'}
      </button>
    </div>
  )
}
