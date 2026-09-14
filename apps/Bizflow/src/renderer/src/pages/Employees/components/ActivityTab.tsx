import { History, Plus } from 'lucide-react'
import type { EmployeeActivityLog } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useHrFormat } from '../ui/hrFormat'
import { HrButton, HrEmptyState, HrSectionHeader } from '../ui/primitives'

interface Props {
  activityLogs: EmployeeActivityLog[]
  onAddNote: () => void
  disabled?: boolean
}

export default function ActivityTab({ activityLogs, onAddNote, disabled }: Props) {
  const { t } = useLanguage()
  const fmt = useHrFormat()

  /**
   * The main process stores machine keys (`profile_updated`), which were being
   * shown raw with underscores swapped for spaces. `t()` returns the key itself
   * when a translation is missing, so that is how a miss is detected here — an
   * unknown action still falls back to a readable English phrase rather than
   * rendering `empAction_something_new`.
   */
  const actionLabel = (action: string) => {
    const key = `empAction_${action}`
    const translated = t(key)
    return translated === key ? action.replace(/_/g, ' ') : translated
  }

  return (
    <div className="space-y-4">
      <HrSectionHeader
        icon={History}
        title={t('empActivityLog')}
        subtitle={
          activityLogs.length > 0
            ? `${activityLogs.length} ${t('empEntries') ?? 'entries'}`
            : undefined
        }
        action={
          !disabled ? (
            <HrButton onClick={onAddNote} icon={Plus} variant="primary" size="md">
              {t('empAddNote')}
            </HrButton>
          ) : undefined
        }
      />

      {activityLogs.length === 0 ? (
        <HrEmptyState icon={History} title={t('empNoActivityYet')} description={t('empNoActivityHint')} />
      ) : (
        <div className="relative">
          <div className="absolute start-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-4 ps-10">
            {activityLogs.map(log => (
              <div key={log.id} className="relative">
                <div className="absolute -start-6 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white dark:border-slate-800" />
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {actionLabel(log.action)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {fmt.date(log.createdAt)} · {fmt.time(log.createdAt)}
                    </span>
                  </div>
                  {log.details && <p className="text-sm text-slate-700 dark:text-slate-300">{log.details}</p>}
                  {log.performedBy && (
                    <p className="text-xs text-slate-400 mt-1">
                      {t('empActivityBy') ?? 'by'} {log.performedBy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
