import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, UserX } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmployeeHero from './components/EmployeeHero'
import TabBar from './components/TabBar'
import OverviewTab from './components/OverviewTab'
import AttendanceTab from './components/AttendanceTab'
import ShiftsTab from './components/ShiftsTab'
import OvertimeTab from './components/OvertimeTab'
import LeaveTab from './components/LeaveTab'
import PayrollTab from './components/PayrollTab'
import LifecycleTab from './components/LifecycleTab'
import ActivityTab from './components/ActivityTab'
import DocumentsTab from './components/DocumentsTab'
import { useEmployeeProfile } from './hooks/useEmployeeProfile'
import { useHrPermissions } from './hooks/useHrPermissions'
import { hourlyRateFor, overtimePayFor } from '../../../../shared/hrRate'
import { expiryState, daysUntil } from './expiry'
import { localDayOffset, shiftDurationMinutes, calendarDay } from './shiftTimes'
import { formatMinutes, useHrFormat } from './ui/hrFormat'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  HrButton,
  HrEmptyState,
  HrField,
  HrFormSection,
  HrModalActions,
  HR_INPUT_CLASS,
  HR_SELECT_CLASS,
  HR_TEXTAREA_CLASS,
} from './ui/primitives'
import type { AttendanceStatus } from './types'

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const hr = useHrPermissions()
  const fmt = useHrFormat()
  const s = useEmployeeProfile(id)

  if (s.loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Used to be `return null`, which rendered an empty page with no explanation,
  // no way back, and no clue whether the record was missing or still loading.
  if (!s.emp) return (
    <div className="p-6 mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft size={16} /> {t('empBackToEmployees')}
      </button>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <HrEmptyState
          icon={UserX}
          tone="danger"
          title={t('empNotFound') ?? 'Employee not found'}
          description={
            t('empNotFoundHint') ??
            'This record may have been deleted, or the link may be out of date. The employee list shows everyone currently on file.'
          }
          action={
            <HrButton variant="primary" size="md" onClick={() => navigate('/employees')}>
              {t('empBackToEmployees')}
            </HrButton>
          }
        />
      </div>
    </div>
  )

  const calendar = s.buildCalendar()

  return (
    <div className="p-6 mx-auto max-w-[1200px] space-y-6">
      <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft size={16} /> {t('empBackToEmployees')}
      </button>

      <EmployeeHero
        emp={s.emp}
        todayAtt={s.todayAtt}
        checkingIn={s.checkingIn}
        checkingOut={s.checkingOut}
        onCheckIn={s.handleCheckIn}
        onCheckOut={s.handleCheckOut}
        onLogAttendance={() => s.openAttendanceFor(localDayOffset(0), s.todayAtt)}
        onAddNote={() => s.setShowNoteModal(true)}
        // Ending a contract has real consequences — a checklist, a last working
        // day, a final settlement. Sending the user to the Lifecycle tab keeps
        // that as ONE journey instead of a second, thinner modal that skipped
        // all of it and disagreed with the serious path.
        onEndContract={() => s.setTab('lifecycle')}
        onReactivate={s.reactivate}
      />

      {/* Contract / ID expiry alerts */}
      {([
        { label: t('empContractEnd') ?? 'Contract', value: s.emp.contractEndDate },
        { label: t('empIdExpiry') ?? 'ID / visa', value: s.emp.idExpiryDate },
      ] as const).filter(x => ['expired', 'soon'].includes(expiryState(x.value))).map(x => {
        const st = expiryState(x.value)
        const n = daysUntil(x.value) ?? 0
        return (
          <div key={x.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
            st === 'expired'
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
          }`}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>{x.label}</strong>{' '}
              {st === 'expired'
                ? `${t('empExpiredOn') ?? 'expired on'} ${fmt.date(x.value)}`
                : `${t('empExpiresIn') ?? 'expires in'} ${n} ${t('empDays') ?? 'days'} (${fmt.date(x.value)})`}
            </span>
          </div>
        )
      })}

      {/* Org chart — manager & direct reports */}
      {(s.emp.manager || (s.emp.reports?.length ?? 0) > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t('empReportsToTitle') ?? 'Reports to'}</h3>
              {s.emp.manager ? (
                <button
                  onClick={() => navigate(`/employees/${s.emp!.manager!.id}`)}
                  className="flex items-center gap-3 w-full text-left p-2 -m-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {s.emp.manager.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{s.emp.manager.name}</div>
                    {s.emp.manager.role && <div className="text-xs text-slate-400 truncate">{s.emp.manager.role}</div>}
                  </div>
                </button>
              ) : (
                <p className="text-sm text-slate-400">{t('empNoManagerSet') ?? 'No manager assigned'}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                {t('empDirectReports') ?? 'Direct reports'} {(s.emp.reports?.length ?? 0) > 0 && <span className="text-slate-300 dark:text-slate-600">({s.emp.reports!.length})</span>}
              </h3>
              {(s.emp.reports?.length ?? 0) > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {s.emp.reports!.map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/employees/${r.id}`)}
                      className="flex items-center gap-2.5 w-full text-left p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{r.name}</span>
                      {r.role && <span className="text-xs text-slate-400 truncate ml-auto">{r.role}</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t('empNoReports') ?? 'No direct reports'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <TabBar tab={s.tab === 'payroll' && !hr.canSeePayrollLines ? 'overview' : s.tab} onChange={s.setTab} hidden={hr.canSeePayrollLines ? [] : ['payroll']} counts={{
          attendance: s.emp.attendance.length,
          shifts: s.emp.shifts.length,
          overtime: s.emp.overtimeRecords.length,
          leave: s.emp.leaveRecords.length,
          lifecycle: (s.emp.checklistItems ?? []).filter(i => !i.completed).length,
          payroll: s.emp.payrollRecords.length,
          activity: s.emp.activityLogs.length,
          documents: s.emp.documents.length,
        }} />
        <div className="p-6">
          {s.emp.status === 'terminated' && (
            <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {t('empStatusTerminated')}{s.emp.terminationDate ? ` · ${fmt.date(s.emp.terminationDate)}` : ''}
                </p>
                {s.emp.terminationNote && (
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">{s.emp.terminationNote}</p>
                )}
                <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-1">
                  {t('empTerminatedEditLocked')}
                </p>
              </div>
            </div>
          )}
          {s.tab === 'overview'   && <OverviewTab emp={s.emp} calendar={calendar} onLogDate={(date, att) => s.openAttendanceFor(date, att)} onSetPerformance={s.savePerformance} savingPerf={s.savingPerf} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'attendance' && <AttendanceTab attendance={s.emp.attendance} onLog={() => s.openAttendanceFor(localDayOffset(0), null)} onEdit={a => s.openAttendanceFor(calendarDay(a.date), a)} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'shifts'     && <ShiftsTab shifts={s.emp.shifts} onAdd={() => s.setShowShiftModal(true)} onDelete={s.deleteShift} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'overtime'   && <OvertimeTab overtimeRecords={s.emp.overtimeRecords} onAdd={() => s.setShowOTModal(true)} onApprove={s.approveOvertime} onRevoke={s.revokeOvertime} onApproveAll={s.approveAllOvertime} onDelete={s.deleteOvertime} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'leave'      && <LeaveTab leaveRecords={s.emp.leaveRecords} balance={s.emp.leaveBalance} onAdd={() => s.setShowLeaveModal(true)} onApprove={id => s.setLeaveStatus(id, 'approved')} onReject={id => s.setLeaveStatus(id, 'rejected')} onApproveAll={s.approveAllLeave} onDelete={s.deleteLeave} disabled={s.emp.status === 'terminated'} />}
          {/* Lifecycle owns its own writes (checklist, settlement) and calls back to re-read. */}
          {s.tab === 'lifecycle'  && <LifecycleTab emp={s.emp} onChanged={s.reload} />}
          {/* Payroll stays available after termination: a final settlement payslip,
              or a reprint for a tax query, is exactly when you need it most. The
              old blanket `disabled` locked it away. */}
          {s.tab === 'payroll'    && hr.canSeePayrollLines && <PayrollTab emp={s.emp} payrollRecords={s.emp.payrollRecords} onAdd={() => s.setShowPayModal(true)} onMarkPaid={s.markPayrollPaid} />}
          {s.tab === 'activity'   && <ActivityTab activityLogs={s.emp.activityLogs} onAddNote={() => s.setShowNoteModal(true)} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'documents'  && <DocumentsTab documents={s.emp.documents} onAdd={s.openDocForAdd} onEdit={s.openDocForEdit} onOpen={s.openDocument} onDelete={s.deleteDocument} disabled={s.emp.status === 'terminated'} />}
        </div>
      </div>

      {/* ── Attendance Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={s.showAttModal} onClose={() => s.setShowAttModal(false)} title={t('empLogAttendanceTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HrField label={t('empDate')}>
              <input type="date" value={s.attForm.date} onChange={e => s.setAttForm(p => ({ ...p, date: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('status')}>
              <select value={s.attForm.status} onChange={e => s.setAttForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))}
                className={HR_SELECT_CLASS}>
                <option value="present">{t('empStatusPresent')}</option>
                <option value="absent">{t('empStatusAbsent')}</option>
                <option value="late">{t('empStatusLate')}</option>
                <option value="half-day">{t('empHalfDay')}</option>
                <option value="leave">{t('empStatusLeave')}</option>
              </select>
            </HrField>
            <HrField label={t('empCheckInCol')}>
              <input type="time" value={s.attForm.checkIn} onChange={e => s.setAttForm(p => ({ ...p, checkIn: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empCheckOutCol')}>
              <input type="time" value={s.attForm.checkOut} onChange={e => s.setAttForm(p => ({ ...p, checkOut: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
          </div>
          <HrField label={t('notes')}>
            <textarea value={s.attForm.notes} onChange={e => s.setAttForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className={HR_TEXTAREA_CLASS} />
          </HrField>
          <HrModalActions
            onCancel={() => s.setShowAttModal(false)}
            onSubmit={s.saveAttendance}
            cancelLabel={t('cancel')}
            submitLabel={t('save')}
            submitting={s.savingAtt}
          />
        </div>
      </Modal>

      {/* ── Payroll Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={s.showPayModal} onClose={() => s.setShowPayModal(false)} title={t('empAddEditPayrollTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HrField label={t('month')}>
              <select value={s.payForm.month} onChange={e => s.setPayForm(p => ({ ...p, month: Number(e.target.value) }))}
                className={HR_SELECT_CLASS}>
                {fmt.monthNames().map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </HrField>
            <HrField label={t('empYear')}>
              <input type="number" value={s.payForm.year} onChange={e => s.setPayForm(p => ({ ...p, year: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empBaseSalary')}>
              <input type="number" min={0} value={s.payForm.baseSalary} onChange={e => s.setPayForm(p => ({ ...p, baseSalary: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empBonuses')}>
              <input type="number" min={0} value={s.payForm.bonuses} onChange={e => s.setPayForm(p => ({ ...p, bonuses: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empDeductions')}>
              <input type="number" min={0} value={s.payForm.deductions} onChange={e => s.setPayForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('status')}>
              <select value={s.payForm.status} onChange={e => s.setPayForm(p => ({ ...p, status: e.target.value as any }))}
                className={HR_SELECT_CLASS}>
                <option value="pending">{t('empStatusPending')}</option>
                <option value="paid">{t('empPaid')}</option>
              </select>
            </HrField>
            <HrField label={t('empPaidDate')}>
              <input type="date" value={s.payForm.paidDate} onChange={e => s.setPayForm(p => ({ ...p, paidDate: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('empNetPay')}</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{fmt.money(s.netPay)}</span>
          </div>
          <HrModalActions
            onCancel={() => s.setShowPayModal(false)}
            onSubmit={s.savePayroll}
            cancelLabel={t('cancel')}
            submitLabel={t('empSavePayroll')}
            submitting={s.savingPay}
          />
        </div>
      </Modal>

      {/* ── Note Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={s.showNoteModal} onClose={() => s.setShowNoteModal(false)} title={t('empAddNoteTitle')}>
        <div className="space-y-4">
          <textarea
            value={s.noteText} onChange={e => s.setNoteText(e.target.value)}
            rows={4} placeholder={t('empEnterNote')}
            className={HR_TEXTAREA_CLASS}
          />
          <HrModalActions
            onCancel={() => s.setShowNoteModal(false)}
            onSubmit={s.saveNote}
            cancelLabel={t('cancel')}
            submitLabel={t('empAddNote')}
            submitting={s.savingNote}
            submitDisabled={!s.noteText.trim()}
          />
        </div>
      </Modal>

      {/* ── Shift Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={s.showShiftModal} onClose={() => s.setShowShiftModal(false)} title={t('empAddShiftTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HrField label={t('empDate')}>
              <input type="date" value={s.shiftForm.date} onChange={e => s.setShiftForm(p => ({ ...p, date: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empShiftType')}>
              <select value={s.shiftForm.shiftType} onChange={e => {
                const type = e.target.value
                const presets: Record<string, { startTime: string; endTime: string; breakMins: number }> = {
                  morning: { startTime: '08:00', endTime: '16:00', breakMins: 30 },
                  evening: { startTime: '16:00', endTime: '00:00', breakMins: 30 },
                  night:   { startTime: '00:00', endTime: '08:00', breakMins: 30 },
                }
                s.setShiftForm(p => ({ ...p, shiftType: type, ...(presets[type] ?? {}) }))
              }}
                className={HR_SELECT_CLASS}>
                <option value="morning">{t('empMorningShift')}</option>
                <option value="evening">{t('empEveningShift')}</option>
                <option value="night">{t('empNightShift')}</option>
                <option value="custom">{t('empCustomShift')}</option>
              </select>
            </HrField>
            <HrField label={t('empStartTime')}>
              <input type="time" value={s.shiftForm.startTime} onChange={e => s.setShiftForm(p => ({ ...p, startTime: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empEndTime')}>
              <input type="time" value={s.shiftForm.endTime} onChange={e => s.setShiftForm(p => ({ ...p, endTime: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empBreakMinutes')}>
              <input type="number" min={0} value={s.shiftForm.breakMins} onChange={e => s.setShiftForm(p => ({ ...p, breakMins: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            {/* A night shift typed as 22:00 → 06:00 is easy to get wrong; showing the
                paid length as it is typed makes an accidental 24-hour shift obvious. */}
            <HrField label={t('empPaidHours')}>
              <div className={`${HR_INPUT_CLASS} bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300`} dir="ltr">
                {formatMinutes(
                  shiftDurationMinutes(s.shiftForm.startTime, s.shiftForm.endTime, s.shiftForm.breakMins),
                  t
                )}
              </div>
            </HrField>
          </div>
          {s.shiftForm.startTime === s.shiftForm.endTime && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{t('empShiftZeroLengthHint')}</p>
          )}
          <HrField label={t('notes')}>
            <input type="text" value={s.shiftForm.notes} onChange={e => s.setShiftForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('empOptionalNotes')}
              className={HR_INPUT_CLASS} />
          </HrField>
          <HrModalActions
            onCancel={() => s.setShowShiftModal(false)}
            onSubmit={s.saveShift}
            cancelLabel={t('cancel')}
            submitLabel={t('empAddShift')}
            submitting={s.savingShift}
          />
        </div>
      </Modal>

      {/* ── Overtime Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={s.showOTModal} onClose={() => s.setShowOTModal(false)} title={t('empLogOvertimeTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <HrField label={t('empDate')}>
              <input type="date" value={s.otForm.date} onChange={e => s.setOtForm(p => ({ ...p, date: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('hours')}>
              <input type="number" min={0.5} step={0.5} value={s.otForm.hours} onChange={e => s.setOtForm(p => ({ ...p, hours: Number(e.target.value) }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empRateMultiplier')}>
              <select value={s.otForm.multiplier} onChange={e => s.setOtForm(p => ({ ...p, multiplier: Number(e.target.value) }))}
                className={HR_SELECT_CLASS}>
                <option value={1.0}>{t('empRegularRate')}</option>
                <option value={1.5}>{t('empTimeAndHalf')}</option>
                <option value={2.0}>{t('empDoubleTime')}</option>
              </select>
            </HrField>
          </div>
          <HrField label={t('reason')}>
            <input type="text" value={s.otForm.reason} onChange={e => s.setOtForm(p => ({ ...p, reason: e.target.value }))} placeholder={t('empReasonPlaceholder')}
              className={HR_INPUT_CLASS} />
          </HrField>
          {/* Pay estimate */}
          {s.emp.salary > 0 && (() => {
            // Was `salary / 160` for anything that was not hourly or weekly, which
            // priced daily staff twenty times too low. Now the shared rule.
            const hourlyRate = hourlyRateFor(s.emp.salary, s.emp.salaryType)
            const est = overtimePayFor(s.emp.salary, s.emp.salaryType, s.otForm.hours, s.otForm.multiplier)
            return (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between">
                <span className="text-sm text-amber-700 dark:text-amber-400">{t('empEstimatedOTPay')}</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {fmt.money(est)}
                  <span className="text-xs font-normal ml-1 opacity-70">({s.otForm.hours}h × {s.otForm.multiplier}× @ {fmt.money(hourlyRate)}/hr)</span>
                </span>
              </div>
            )
          })()}
          <HrModalActions
            onCancel={() => s.setShowOTModal(false)}
            onSubmit={s.saveOvertime}
            cancelLabel={t('cancel')}
            submitLabel={t('empLogOvertime')}
            submitting={s.savingOT}
          />
        </div>
      </Modal>
      {/* ── Leave Request Modal ──────────────────────────────────────────── */}
      <Modal isOpen={s.showLeaveModal} onClose={() => s.setShowLeaveModal(false)} title={t('empRequestLeave') ?? 'Request leave'} size="sm">
        <div className="space-y-4">
          <HrField label={t('empLeaveType')}>
            <select
              value={s.leaveForm.type}
              onChange={e => s.setLeaveForm(p => ({ ...p, type: e.target.value as typeof p.type }))}
              className={HR_SELECT_CLASS}
            >
              <option value="annual">{t('empLeaveAnnual')}</option>
              <option value="sick">{t('empLeaveSick')}</option>
              <option value="unpaid">{t('empLeaveUnpaid')}</option>
              <option value="other">{t('empLeaveOther')}</option>
            </select>
          </HrField>
          <div className="grid grid-cols-2 gap-4">
            <HrField label={t('empLeaveStart')}>
              <input type="date" value={s.leaveForm.startDate}
                onChange={e => s.setLeaveForm(p => ({ ...p, startDate: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
            <HrField label={t('empLeaveEnd')}>
              <input type="date" value={s.leaveForm.endDate}
                onChange={e => s.setLeaveForm(p => ({ ...p, endDate: e.target.value }))}
                className={HR_INPUT_CLASS} />
            </HrField>
          </div>
          <HrField label={t('empLeaveDays')}>
            <input type="number" min={0} step={0.5} value={s.leaveForm.days}
              onChange={e => s.setLeaveForm(p => ({ ...p, days: Number(e.target.value) }))}
              className={HR_INPUT_CLASS} />
          </HrField>
          <HrField label={t('reason')}>
            <textarea value={s.leaveForm.reason} rows={2}
              onChange={e => s.setLeaveForm(p => ({ ...p, reason: e.target.value }))}
              className={HR_TEXTAREA_CLASS} />
          </HrField>
          <HrModalActions
            onCancel={() => s.setShowLeaveModal(false)}
            onSubmit={s.saveLeave}
            cancelLabel={t('cancel')}
            submitLabel={t('empRequestLeave')}
            submitting={s.savingLeave}
          />
        </div>
      </Modal>

      {/* ── Document Modal — attach a new file, or correct an existing one ── */}
      <Modal
        isOpen={s.showDocModal}
        onClose={() => s.setShowDocModal(false)}
        title={t(s.editingDocId ? 'empDocumentEditTitle' : 'empUploadDocument')}
        size="sm"
      >
        <div className="space-y-4">
          <HrField label={t('empDocumentTitle')}>
            <input
              value={s.docForm.title}
              onChange={e => s.setDocForm(p => ({ ...p, title: e.target.value }))}
              placeholder={t('empDocumentTitlePlaceholder')}
              className={HR_INPUT_CLASS}
            />
          </HrField>
          <HrField label={t('empDocumentType')}>
            <select
              value={s.docForm.type}
              onChange={e => s.setDocForm(p => ({ ...p, type: e.target.value }))}
              className={HR_SELECT_CLASS}
            >
              <option value="contract">{t('empDocContract')}</option>
              <option value="id_copy">{t('empDocIdCopy')}</option>
              <option value="certificate">{t('empDocCertificate')}</option>
              <option value="other">{t('empDocOther')}</option>
            </select>
          </HrField>

          {/* Reference, issue and expiry are what make a document *actionable* —
              without them nothing can warn that a residency permit is about to
              lapse. They are collected on the same screen as the file so there is
              one step, not a second pass the user never comes back to do. */}
          <HrFormSection title={t('empDocRenewalSection')}>
            <div className="space-y-4">
              <HrField label={t('empDocumentNumber')}>
                <input
                  value={s.docForm.reference}
                  onChange={e => s.setDocForm(p => ({ ...p, reference: e.target.value }))}
                  className={HR_INPUT_CLASS}
                  dir="ltr"
                />
              </HrField>
              <div className="grid grid-cols-2 gap-4">
                <HrField label={t('empDocIssued')}>
                  <input type="date" value={s.docForm.issuedAt}
                    onChange={e => s.setDocForm(p => ({ ...p, issuedAt: e.target.value }))}
                    className={HR_INPUT_CLASS} />
                </HrField>
                <HrField label={t('empDocExpires')}>
                  <input type="date" value={s.docForm.expiresAt}
                    onChange={e => s.setDocForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className={HR_INPUT_CLASS} />
                </HrField>
              </div>
              <p className="text-xs text-slate-400">{t('empDocRenewalHint')}</p>
            </div>
          </HrFormSection>

          {!s.editingDocId && (
            <p className="text-xs text-slate-400">{t('empDocumentPickHint')}</p>
          )}
          <HrModalActions
            onCancel={() => s.setShowDocModal(false)}
            onSubmit={s.saveDocument}
            cancelLabel={t('cancel')}
            submitLabel={t(s.editingDocId ? 'save' : 'empChooseFile')}
            submitting={s.savingDoc}
          />
        </div>
      </Modal>

      {/* ── Confirm Dialog ───────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!s.confirm}
        message={s.confirm?.message ?? ''}
        onConfirm={() => s.confirm?.onConfirm()}
        onCancel={() => s.setConfirm(null)}
      />
    </div>
  )
}

