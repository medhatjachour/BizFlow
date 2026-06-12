import { Plus } from 'lucide-react'
import type { EmployeeActivityLog } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  activityLogs: EmployeeActivityLog[]
  onAddNote: () => void
  disabled?: boolean
}

export default function ActivityTab({ activityLogs, onAddNote, disabled }: Props) {
  const { t } = useLanguage()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empActivityLog')}</h3>
        {!disabled && (
          <button onClick={onAddNote} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
            <Plus size={14} /> {t('empAddNote')}
          </button>
        )}
      </div>
      {activityLogs.length === 0 ? (
        <p className="text-slate-500 text-center py-12">{t('empNoActivityYet')}</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-4 pl-10">
            {activityLogs.map(log => (
              <div key={log.id} className="relative">
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white dark:border-slate-800" />
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  {log.details && <p className="text-sm text-slate-700 dark:text-slate-300">{log.details}</p>}
                  {log.performedBy && <p className="text-xs text-slate-400 mt-1">by {log.performedBy}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
