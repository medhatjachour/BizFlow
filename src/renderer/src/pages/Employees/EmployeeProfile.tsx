import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import EmployeeHero from './components/EmployeeHero'
import TabBar from './components/TabBar'
import OverviewTab from './components/OverviewTab'
import AttendanceTab from './components/AttendanceTab'
import ShiftsTab from './components/ShiftsTab'
import OvertimeTab from './components/OvertimeTab'
import PayrollTab from './components/PayrollTab'
import ActivityTab from './components/ActivityTab'
import DocumentsTab from './components/DocumentsTab'
import { useEmployeeProfile } from './hooks/useEmployeeProfile'
import { useLanguage } from '../../contexts/LanguageContext'
import type { AttendanceStatus } from './types'

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const s = useEmployeeProfile(id)

  if (s.loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!s.emp) return null

  const calendar = s.buildCalendar()

  return (
    <div className="p-6 mx-auto space-y-6">
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
        onLogAttendance={() => s.openAttendanceFor(new Date().toISOString().split('T')[0], s.todayAtt)}
        onAddNote={() => s.setShowNoteModal(true)}
        onEndContract={() => s.setShowTerminateModal(true)}
        onReactivate={s.reactivate}
      />

      {/* Tabs panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <TabBar tab={s.tab} onChange={s.setTab} counts={{
          attendance: s.emp.attendance.length,
          shifts: s.emp.shifts.length,
          overtime: s.emp.overtimeRecords.length,
          payroll: s.emp.payrollRecords.length,
          activity: s.emp.activityLogs.length,
          documents: s.emp.documents.length,
        }} />
        <div className="p-6">
          {s.emp.status === 'terminated' && (
            <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Contract ended{s.emp.terminationDate ? ` on ${new Date(s.emp.terminationDate).toLocaleDateString()}` : ''}
                </p>
                {s.emp.terminationNote && (
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">{s.emp.terminationNote}</p>
                )}
                <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-1">All actions are locked. Use the Reactivate button to restore.</p>
              </div>
            </div>
          )}
          {s.tab === 'overview'   && <OverviewTab emp={s.emp} calendar={calendar} onLogDate={(date, att) => s.openAttendanceFor(date, att)} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'attendance' && <AttendanceTab attendance={s.emp.attendance} onLog={() => s.openAttendanceFor(new Date().toISOString().split('T')[0], null)} onEdit={a => s.openAttendanceFor(new Date(a.date).toISOString().split('T')[0], a)} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'shifts'     && <ShiftsTab shifts={s.emp.shifts} onAdd={() => s.setShowShiftModal(true)} onDelete={s.deleteShift} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'overtime'   && <OvertimeTab overtimeRecords={s.emp.overtimeRecords} onAdd={() => s.setShowOTModal(true)} onApprove={s.approveOvertime} onDelete={s.deleteOvertime} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'payroll'    && <PayrollTab payrollRecords={s.emp.payrollRecords} onAdd={() => s.setShowPayModal(true)} onMarkPaid={s.markPayrollPaid} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'activity'   && <ActivityTab activityLogs={s.emp.activityLogs} onAddNote={() => s.setShowNoteModal(true)} disabled={s.emp.status === 'terminated'} />}
          {s.tab === 'documents'  && <DocumentsTab documents={s.emp.documents} />}
        </div>
      </div>

      {/* ── Attendance Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={s.showAttModal} onClose={() => s.setShowAttModal(false)} title={t('empLogAttendanceTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empDate')}</label>
              <input type="date" value={s.attForm.date} onChange={e => s.setAttForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('status')}</label>
              <select value={s.attForm.status} onChange={e => s.setAttForm(p => ({ ...p, status: e.target.value as AttendanceStatus }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                <option value="present">{t('empStatusPresent')}</option>
                <option value="absent">{t('empStatusAbsent')}</option>
                <option value="late">{t('empStatusLate')}</option>
                <option value="half-day">{t('empHalfDay')}</option>
                <option value="leave">{t('empStatusLeave')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empCheckInCol')}</label>
              <input type="time" value={s.attForm.checkIn} onChange={e => s.setAttForm(p => ({ ...p, checkIn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empCheckOutCol')}</label>
              <input type="time" value={s.attForm.checkOut} onChange={e => s.setAttForm(p => ({ ...p, checkOut: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('notes')}</label>
            <textarea value={s.attForm.notes} onChange={e => s.setAttForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setShowAttModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.saveAttendance} disabled={s.savingAtt} className="btn-primary">{s.savingAtt ? t('empSaving') : t('save')}</button>
          </div>
        </div>
      </Modal>

      {/* ── Payroll Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={s.showPayModal} onClose={() => s.setShowPayModal(false)} title={t('empAddEditPayrollTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('month')}</label>
              <select value={s.payForm.month} onChange={e => s.setPayForm(p => ({ ...p, month: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empYear')}</label>
              <input type="number" value={s.payForm.year} onChange={e => s.setPayForm(p => ({ ...p, year: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empBaseSalary')}</label>
              <input type="number" min={0} value={s.payForm.baseSalary} onChange={e => s.setPayForm(p => ({ ...p, baseSalary: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empBonuses')}</label>
              <input type="number" min={0} value={s.payForm.bonuses} onChange={e => s.setPayForm(p => ({ ...p, bonuses: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empDeductions')}</label>
              <input type="number" min={0} value={s.payForm.deductions} onChange={e => s.setPayForm(p => ({ ...p, deductions: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('status')}</label>
              <select value={s.payForm.status} onChange={e => s.setPayForm(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                <option value="pending">{t('empStatusPending')}</option>
                <option value="paid">{t('empPaid')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empPaidDate')}</label>
              <input type="date" value={s.payForm.paidDate} onChange={e => s.setPayForm(p => ({ ...p, paidDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('empNetPay')}</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">${s.netPay.toFixed(2)}</span>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setShowPayModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.savePayroll} disabled={s.savingPay} className="btn-primary">{s.savingPay ? t('empSaving') : t('empSavePayroll')}</button>
          </div>
        </div>
      </Modal>

      {/* ── Note Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={s.showNoteModal} onClose={() => s.setShowNoteModal(false)} title={t('empAddNoteTitle')}>
        <div className="space-y-4">
          <textarea
            value={s.noteText} onChange={e => s.setNoteText(e.target.value)}
            rows={4} placeholder={t('empEnterNote')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm resize-none"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setShowNoteModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.saveNote} disabled={s.savingNote || !s.noteText.trim()} className="btn-primary">{s.savingNote ? t('empSaving') : t('empAddNote')}</button>
          </div>
        </div>
      </Modal>

      {/* ── Shift Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={s.showShiftModal} onClose={() => s.setShowShiftModal(false)} title={t('empAddShiftTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empDate')}</label>
              <input type="date" value={s.shiftForm.date} onChange={e => s.setShiftForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empShiftType')}</label>
              <select value={s.shiftForm.shiftType} onChange={e => {
                const type = e.target.value
                const presets: Record<string, { startTime: string; endTime: string; breakMins: number }> = {
                  morning: { startTime: '08:00', endTime: '16:00', breakMins: 30 },
                  evening: { startTime: '16:00', endTime: '00:00', breakMins: 30 },
                  night:   { startTime: '00:00', endTime: '08:00', breakMins: 30 },
                }
                s.setShiftForm(p => ({ ...p, shiftType: type, ...(presets[type] ?? {}) }))
              }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                <option value="morning">{t('empMorningShift')}</option>
                <option value="evening">{t('empEveningShift')}</option>
                <option value="night">{t('empNightShift')}</option>
                <option value="custom">{t('empCustomShift')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empStartTime')}</label>
              <input type="time" value={s.shiftForm.startTime} onChange={e => s.setShiftForm(p => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empEndTime')}</label>
              <input type="time" value={s.shiftForm.endTime} onChange={e => s.setShiftForm(p => ({ ...p, endTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empBreakMinutes')}</label>
              <input type="number" min={0} value={s.shiftForm.breakMins} onChange={e => s.setShiftForm(p => ({ ...p, breakMins: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('notes')}</label>
            <input type="text" value={s.shiftForm.notes} onChange={e => s.setShiftForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('empOptionalNotes')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setShowShiftModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.saveShift} disabled={s.savingShift} className="btn-primary">{s.savingShift ? t('empSaving') : t('empAddShift')}</button>
          </div>
        </div>
      </Modal>

      {/* ── Overtime Modal ───────────────────────────────────────────────── */}
      <Modal isOpen={s.showOTModal} onClose={() => s.setShowOTModal(false)} title={t('empLogOvertimeTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empDate')}</label>
              <input type="date" value={s.otForm.date} onChange={e => s.setOtForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('hours')}</label>
              <input type="number" min={0.5} step={0.5} value={s.otForm.hours} onChange={e => s.setOtForm(p => ({ ...p, hours: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('empRateMultiplier')}</label>
              <select value={s.otForm.multiplier} onChange={e => s.setOtForm(p => ({ ...p, multiplier: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
                <option value={1.0}>{t('empRegularRate')}</option>
                <option value={1.5}>{t('empTimeAndHalf')}</option>
                <option value={2.0}>{t('empDoubleTime')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('reason')}</label>
            <input type="text" value={s.otForm.reason} onChange={e => s.setOtForm(p => ({ ...p, reason: e.target.value }))} placeholder={t('empReasonPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
          </div>
          {/* Pay estimate */}
          {s.emp.salary > 0 && (() => {
            const hourlyRate = s.emp.salaryType === 'hourly' ? s.emp.salary
              : s.emp.salaryType === 'weekly' ? s.emp.salary / 40
              : s.emp.salary / 160
            const est = hourlyRate * s.otForm.hours * s.otForm.multiplier
            return (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between">
                <span className="text-sm text-amber-700 dark:text-amber-400">{t('empEstimatedOTPay')}</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  ${est.toFixed(2)}
                  <span className="text-xs font-normal ml-1 opacity-70">({s.otForm.hours}h × {s.otForm.multiplier}× @ ${hourlyRate.toFixed(2)}/hr)</span>
                </span>
              </div>
            )
          })()}
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setShowOTModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.saveOvertime} disabled={s.savingOT} className="btn-primary">{s.savingOT ? t('empSaving') : t('empLogOvertime')}</button>
          </div>
        </div>
      </Modal>
      {/* ── Confirm Dialog ───────────────────────────────────────────────── */}
      <Modal isOpen={!!s.confirm} onClose={() => s.setConfirm(null)} title={t('empConfirmAction')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{s.confirm?.message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => s.setConfirm(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300">{t('cancel')}</button>
            <button onClick={s.confirm?.onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">{t('delete')}</button>
          </div>
        </div>
      </Modal>

      {/* ── End Contract Modal ───────────────────────────────────────────── */}
      <Modal isOpen={s.showTerminateModal} onClose={() => s.setShowTerminateModal(false)} title="End Contract" size="sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <span className="text-red-500 mt-0.5">⚠</span>
            <p className="text-sm text-red-700 dark:text-red-400">
              This will mark <strong>{s.emp?.name}</strong> as <strong>terminated</strong>. Their data is preserved and can be reinstated by editing the employee record.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Termination Date</label>
            <input
              type="date"
              value={s.terminateForm.terminationDate}
              onChange={e => s.setTerminateForm(p => ({ ...p, terminationDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reason / Note (optional)</label>
            <textarea
              rows={3}
              value={s.terminateForm.terminationNote}
              onChange={e => s.setTerminateForm(p => ({ ...p, terminationNote: e.target.value }))}
              placeholder="Resignation, end of contract, redundancy…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => s.setShowTerminateModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={s.endContract}
              disabled={s.savingTerminate}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s.savingTerminate ? 'Saving…' : 'End Contract'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

