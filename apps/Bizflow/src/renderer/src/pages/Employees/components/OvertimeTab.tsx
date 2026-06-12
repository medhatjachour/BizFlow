import { Plus, Trash2, CheckCircle, AlarmClock } from 'lucide-react'
import type { EmployeeOvertime } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  overtimeRecords: EmployeeOvertime[]
  onAdd: () => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export default function OvertimeTab({ overtimeRecords, onAdd, onApprove, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const totalHours = overtimeRecords.reduce((sum, o) => sum + o.hours, 0)
  const approvedHours = overtimeRecords.filter(o => o.approved).reduce((sum, o) => sum + o.hours, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <AlarmClock size={16} /> {t('empOvertimeRecords')}
        </h3>
        {!disabled && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
            <Plus size={14} /> {t('empLogOvertime')}
          </button>
        )}
      </div>

      {/* Summary row */}
      {overtimeRecords.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalHours.toFixed(1)}h</div>
            <div className="text-xs text-slate-500">{t('empTotalOTHours')}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="text-xl font-bold text-green-600">{approvedHours.toFixed(1)}h</div>
            <div className="text-xs text-slate-500">{t('empApproved')}</div>
          </div>
          <div className="px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <div className="text-xl font-bold text-amber-600">{(totalHours - approvedHours).toFixed(1)}h</div>
            <div className="text-xs text-slate-500">{t('empPendingApproval')}</div>
          </div>
        </div>
      )}

      {overtimeRecords.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <AlarmClock size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p>{t('empNoOvertimeYet')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {[t('empDate'), t('empHourly'), t('empMultiplier'), t('reason'), t('status'), t('empApprovedBy'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {overtimeRecords.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{o.hours}h</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.multiplier}×</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{o.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    {o.approved ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('empApproved')}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('empStatusPending')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.approvedBy ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!disabled && !o.approved && (
                        <button
                          onClick={() => onApprove(o.id)}
                          title={t('empApproved')}
                          className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {!disabled && (
                        <button onClick={() => onDelete(o.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface Props {
  overtimeRecords: EmployeeOvertime[]
  onAdd: () => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}

