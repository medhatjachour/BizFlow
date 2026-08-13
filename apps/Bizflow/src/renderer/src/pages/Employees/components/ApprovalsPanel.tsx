import { useNavigate } from 'react-router-dom'
import {
  Inbox, Check, X, Plane, AlarmClock, Zap,
} from 'lucide-react'
import { useApprovals } from '../hooks/useApprovals'
import { useLanguage } from '../../../contexts/LanguageContext'
import { getInitials, avatarColor } from '../utils'

/**
 * ApprovalsPanel — team-wide queue of pending leave requests and unapproved
 * overtime, with inline approve / reject actions for HR managers.
 */
export default function ApprovalsPanel() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const s = useApprovals()

  const total = s.leave.length + s.overtime.length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Inbox size={15} className="text-primary" />
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empApprovals') ?? 'Approvals'}</h3>
        <span className="ml-auto flex items-center gap-2">
          {total > 0 && s.leave.length > 0 && (
            <button
              onClick={() => s.approveAllLeave(s.leave)}
              disabled={s.bulkBusy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-[11px] font-medium disabled:opacity-50"
            >
              <Zap size={10} /> {t('empApproveAllLeave') ?? 'Approve all leave'}
            </button>
          )}
          {total > 0 && s.overtime.length > 0 && (
            <button
              onClick={() => s.approveAllOvertime(s.overtime)}
              disabled={s.bulkBusy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-[11px] font-medium disabled:opacity-50"
            >
              <Zap size={10} /> {t('empApproveAllOvertime') ?? 'Approve all overtime'}
            </button>
          )}
        </span>
      </div>

      <div className="p-5 space-y-3 max-h-[360px] overflow-y-auto">
        {s.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-2">
              <Check size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('empNoPendingApprovals') ?? 'No pending approvals'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('empAllCaughtUp') ?? 'You\'re all caught up'}</p>
          </div>
        ) : (
          <>
            {/* Pending leave */}
            {s.leave.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Plane size={11} /> {t('empLeaveRequests') ?? 'Leave requests'} ({s.leave.length})
                </p>
                {s.leave.map(l => (
                  <div key={l.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 px-3 py-2">
                    <button
                      onClick={() => l.employee && navigate(`/employees/${l.employee.id}`)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(l.employee?.name ?? '?')} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                    >
                      {getInitials(l.employee?.name ?? '?')}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{l.employee?.name ?? 'Unknown'}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t(`empLeave${l.type}`) ?? l.type} · {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()} · {l.days}d
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => s.approveLeave(l.id)}
                        disabled={s.busyId === l.id}
                        title="Approve"
                        className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => s.rejectLeave(l.id)}
                        disabled={s.busyId === l.id}
                        title="Reject"
                        className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending overtime */}
            {s.overtime.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <AlarmClock size={11} /> {t('empOvertimeRequests') ?? 'Overtime'} ({s.overtime.length})
                </p>
                {s.overtime.map(o => (
                  <div key={o.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 px-3 py-2">
                    <button
                      onClick={() => o.employee && navigate(`/employees/${o.employee.id}`)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(o.employee?.name ?? '?')} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                    >
                      {getInitials(o.employee?.name ?? '?')}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{o.employee?.name ?? 'Unknown'}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {o.hours}h · {new Date(o.date).toLocaleDateString()} · {o.multiplier}×
                      </div>
                    </div>
                    <button
                      onClick={() => s.approveOvertime(o.id)}
                      disabled={s.busyId === o.id}
                      title="Approve"
                      className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50 shrink-0"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
