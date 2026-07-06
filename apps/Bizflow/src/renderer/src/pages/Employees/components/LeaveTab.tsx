import { Plus, Trash2, CheckCircle, XCircle, Plane, CheckCheck } from 'lucide-react'
import type { EmployeeLeave, LeaveBalance, LeaveType } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  leaveRecords: EmployeeLeave[]
  balance: LeaveBalance
  onAdd: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onApproveAll?: () => void
  onDelete: (id: string) => void
  disabled?: boolean
}

const TYPE_STYLES: Record<LeaveType, string> = {
  annual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sick:   'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  unpaid: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  other:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

export default function LeaveTab({ leaveRecords, balance, onAdd, onApprove, onReject, onApproveAll, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  const pendingCount = leaveRecords.filter(l => l.status === 'pending').length

  const typeLabels: Record<LeaveType, string> = {
    annual: t('empLeaveAnnual') ?? 'Annual',
    sick:   t('empLeaveSick') ?? 'Sick',
    unpaid: t('empLeaveUnpaid') ?? 'Unpaid',
    other:  t('empLeaveOther') ?? 'Other',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Plane size={16} /> {t('empLeaveRecords') ?? 'Leave & time off'}
        </h3>
        {!disabled && (
          <div className="flex items-center gap-2">
            {pendingCount > 0 && onApproveAll && (
              <button onClick={onApproveAll} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                <CheckCheck size={14} /> {t('empApproveAll') ?? 'Approve all'} ({pendingCount})
              </button>
            )}
            <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
              <Plus size={14} /> {t('empRequestLeave') ?? 'Request leave'}
            </button>
          </div>
        )}
      </div>

      {/* Balance summary */}
      <div className="flex gap-4 flex-wrap">
        <div className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-700">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{balance.allowance}</div>
          <div className="text-xs text-slate-500">{t('empLeaveAllowance') ?? 'Annual allowance'}</div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="text-xl font-bold text-blue-600">{balance.taken}</div>
          <div className="text-xs text-slate-500">{t('empLeaveTaken') ?? 'Taken'}</div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <div className="text-xl font-bold text-amber-600">{balance.pending}</div>
          <div className="text-xs text-slate-500">{t('empLeavePending') ?? 'Pending'}</div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="text-xl font-bold text-green-600">{balance.remaining}</div>
          <div className="text-xs text-slate-500">{t('empLeaveRemaining') ?? 'Remaining'}</div>
        </div>
      </div>

      {leaveRecords.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Plane size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p>{t('empNoLeaveYet') ?? 'No leave requests yet'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {[t('empLeaveType') ?? 'Type', t('period'), t('empLeaveDays') ?? 'Days', t('reason'), t('status'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leaveRecords.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_STYLES[l.type] ?? TYPE_STYLES.other}`}>{typeLabels[l.type] ?? l.type}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{l.days}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{l.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    {l.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('empApproved')}</span>
                    ) : l.status === 'rejected' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('empLeaveRejected') ?? 'Rejected'}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('empStatusPending')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!disabled && l.status === 'pending' && (
                        <>
                          <button onClick={() => onApprove(l.id)} title={t('empApproved')} className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => onReject(l.id)} title={t('empLeaveRejected') ?? 'Reject'} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {!disabled && (
                        <button onClick={() => onDelete(l.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
