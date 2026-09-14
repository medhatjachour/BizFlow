import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'
import type { EmployeeProfile, EmployeeAttendance, AttendanceStatus, EmployeeDocument } from '../types'
import { hrErrorLabel } from '../ui/hrFormat'
import { calendarDay, localDayOffset } from '../shiftTimes'

export type ProfileTab = 'overview' | 'attendance' | 'shifts' | 'overtime' | 'leave' | 'lifecycle' | 'payroll' | 'activity' | 'documents'

const emptyDocForm = { title: '', type: 'contract', reference: '', issuedAt: '', expiresAt: '' }

export function useEmployeeProfile(id: string | undefined) {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const actor = user?.username ?? user?.id ?? undefined

  const [emp, setEmp] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ProfileTab>('overview')

  // ── Attendance modal ─────────────────────────────────────────────────────
  const [showAttModal, setShowAttModal] = useState(false)
  const [attForm, setAttForm] = useState({
    date: localDayOffset(0),
    status: 'present' as AttendanceStatus,
    checkIn: '', checkOut: '', notes: ''
  })
  const [savingAtt, setSavingAtt] = useState(false)

  // ── Payroll modal ────────────────────────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0, bonuses: 0, deductions: 0,
    notes: '', status: 'pending' as const, paidDate: ''
  })
  const [savingPay, setSavingPay] = useState(false)

  // ── Note modal ───────────────────────────────────────────────────────────
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // ── End contract modal ────────────────────────────────────────────────────
  const [showTerminateModal, setShowTerminateModal] = useState(false)
  const [terminateForm, setTerminateForm] = useState({
    terminationDate: localDayOffset(0),
    terminationNote: '',
  })
  const [savingTerminate, setSavingTerminate] = useState(false)

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // ── Check-in/out loading guard ────────────────────────────────────────────
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // ── Shift modal ──────────────────────────────────────────────────────────
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    date: localDayOffset(0),
    shiftType: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    breakMins: 30,
    notes: ''
  })
  const [savingShift, setSavingShift] = useState(false)

  // ── Overtime modal ───────────────────────────────────────────────────────
  const [showOTModal, setShowOTModal] = useState(false)
  const [otForm, setOtForm] = useState({
    date: localDayOffset(0),
    hours: 1,
    reason: '',
    multiplier: 1.5
  })
  const [savingOT, setSavingOT] = useState(false)

  // ── Document modal ───────────────────────────────────────────────────────
  const [showDocModal, setShowDocModal] = useState(false)
  const [docForm, setDocForm] = useState(emptyDocForm)
  /** null = attaching a new file, an id = editing the details of an existing one. */
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [savingDoc, setSavingDoc] = useState(false)

  // ── Leave modal ──────────────────────────────────────────────────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual' as 'annual' | 'sick' | 'unpaid' | 'other',
    startDate: localDayOffset(0),
    endDate: localDayOffset(0),
    days: 1,
    reason: '',
  })
  const [savingLeave, setSavingLeave] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const profile = await ipc.employees.getById(id)
      if (!profile) { navigate('/employees'); return }
      setEmp(profile)
      setPayForm(p => ({ ...p, baseSalary: profile.salary ?? 0 }))
    } catch (err) {
      logger.error('Error loading employee profile:', err)
      navigate('/employees')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  /** A failed call the user must see: translated per action, raw detail to the log. */
  const complain = (res: { code?: string; message?: string } | null | undefined, fallbackKey: string) => {
    if (res?.message) logger.warn(`HR action failed (${fallbackKey}): ${res.message}`)
    toast.error?.(hrErrorLabel(res, t, fallbackKey))
  }

  const failed = (err: unknown, fallbackKey: string) => {
    logger.error('HR action threw:', err)
    toast.error?.(err instanceof Error && err.message ? err.message : t(fallbackKey))
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  const saveAttendance = async () => {
    if (!emp) return
    setSavingAtt(true)
    try {
      const res = await ipc.employees.attendance.upsert({
        employeeId: emp.id,
        date: attForm.date,
        status: attForm.status,
        checkIn: attForm.checkIn ? new Date(`${attForm.date}T${attForm.checkIn}`).toISOString() : null,
        checkOut: attForm.checkOut ? new Date(`${attForm.date}T${attForm.checkOut}`).toISOString() : null,
        notes: attForm.notes || null,
        performedBy: actor
      })
      if (res?.success) { toast.success?.(t('empAttSavedOk')); setShowAttModal(false); load() }
      else complain(res, 'empAttSaveErr')
    } catch (err) { failed(err, 'empAttSaveErr') }
    finally { setSavingAtt(false) }
  }

  const handleCheckIn = async () => {
    if (!emp || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await ipc.employees.attendance.checkIn(emp.id)
      if (res?.success) { toast.success?.(t('empCheckedInOk')); load() }
      else complain(res, 'empCheckInErr')
    } catch (err) { failed(err, 'empCheckInErr') }
    finally { setCheckingIn(false) }
  }

  const handleCheckOut = async () => {
    if (!emp || checkingOut) return
    setCheckingOut(true)
    try {
      const res = await ipc.employees.attendance.checkOut(emp.id)
      if (res?.success) { toast.success?.(t('empCheckedOutOk')); load() }
      else complain(res, 'empCheckOutErr')
    } catch (err) { failed(err, 'empCheckOutErr') }
    finally { setCheckingOut(false) }
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  const savePayroll = async () => {
    if (!emp) return
    setSavingPay(true)
    try {
      const res = await ipc.employees.payroll.upsert({ employeeId: emp.id, ...payForm, performedBy: actor })
      if (res?.success) { toast.success?.(t('empPayrollSavedOk')); setShowPayModal(false); load() }
      else complain(res, 'empPayrollSaveErr')
    } catch (err) { failed(err, 'empPayrollSaveErr') }
    finally { setSavingPay(false) }
  }

  const markPayrollPaid = async (recordId: string) => {
    try {
      const res = await ipc.employees.payroll.markPaid(recordId)
      if (res?.success || res === undefined) { toast.success?.(t('empPayrollPaidOk')); load() }
      else complain(res, 'empPayrollPaidErr')
    } catch (err) { failed(err, 'empPayrollPaidErr') }
  }

  // ── Activity / note ───────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!emp || !noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await ipc.employees.activity.add({
        employeeId: emp.id, action: 'note_added', details: noteText.trim(), performedBy: actor
      })
      if (res?.success) { toast.success?.(t('empNoteAddedOk')); setShowNoteModal(false); setNoteText(''); load() }
      else complain(res, 'empNoteAddErr')
    } catch (err) { failed(err, 'empNoteAddErr') }
    finally { setSavingNote(false) }
  }

  // ── Shifts ────────────────────────────────────────────────────────────────
  const saveShift = async () => {
    if (!emp) return
    setSavingShift(true)
    try {
      const res = await ipc.employees.shifts.add({
        employeeId: emp.id,
        date: new Date(shiftForm.date).toISOString(),
        shiftType: shiftForm.shiftType,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        breakMins: Number(shiftForm.breakMins),
        notes: shiftForm.notes || null
      })
      if (res?.success) { toast.success?.(t('empShiftSavedOk')); setShowShiftModal(false); load() }
      else complain(res, 'empShiftSaveErr')
    } catch (err) { failed(err, 'empShiftSaveErr') }
    finally { setSavingShift(false) }
  }

  const deleteShift = (shiftId: string) => {
    setConfirm({
      message: t('empShiftConfirmDelete'),
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.shifts.delete(shiftId)
          if (res?.success) { toast.success?.(t('empShiftDeletedOk')); load() }
          else complain(res, 'empShiftDeleteErr')
        } catch (err) { failed(err, 'empShiftDeleteErr') }
      }
    })
  }

  // ── Overtime ──────────────────────────────────────────────────────────────
  const saveOvertime = async () => {
    if (!emp) return
    setSavingOT(true)
    try {
      const res = await ipc.employees.overtime.add({
        employeeId: emp.id,
        date: new Date(otForm.date).toISOString(),
        hours: Number(otForm.hours),
        reason: otForm.reason || null,
        multiplier: Number(otForm.multiplier)
      })
      if (res?.success) { toast.success?.(t('empOTLoggedOk')); setShowOTModal(false); load() }
      else complain(res, 'empOTLogErr')
    } catch (err) { failed(err, 'empOTLogErr') }
    finally { setSavingOT(false) }
  }

  const approveOvertime = async (overtimeId: string) => {
    try {
      const res = await ipc.employees.overtime.approve(overtimeId, actor)
      if (res?.success) { toast.success?.(t('empOTApprovedOk')); load() }
      else complain(res, 'empOTApproveErr')
    } catch (err) { failed(err, 'empOTApproveErr') }
  }

  /**
   * Withdraw an approval taken by mistake.
   *
   * Before this, the only way to undo an approval was to delete the record —
   * which also threw away the fact that the hours had been logged at all.
   */
  const revokeOvertime = async (overtimeId: string) => {
    try {
      const res = await ipc.employees.overtime.approve(overtimeId, actor, false)
      if (res?.success) { toast.success?.(t('empOTRevokedOk')); load() }
      else complain(res, 'empOTRevokeErr')
    } catch (err) { failed(err, 'empOTRevokeErr') }
  }

  const approveAllOvertime = async () => {
    if (!emp) return
    const pending = emp.overtimeRecords.filter(o => !o.approved)
    if (!pending.length) return
    for (const o of pending) { try { await ipc.employees.overtime.approve(o.id, actor) } catch { /* skip */ } }
    toast.success?.(t('empOTBulkApproved', { count: pending.length }))
    load()
  }

  const deleteOvertime = (overtimeId: string) => {
    setConfirm({
      message: t('empOTConfirmDelete'),
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.overtime.delete(overtimeId)
          if (res?.success) { toast.success?.(t('empOTDeletedOk')); load() }
          else complain(res, 'empOTDeleteErr')
        } catch (err) { failed(err, 'empOTDeleteErr') }
      }
    })
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  const openDocForAdd = () => {
    setEditingDocId(null)
    setDocForm(emptyDocForm)
    setShowDocModal(true)
  }

  const openDocForEdit = (doc: EmployeeDocument) => {
    setEditingDocId(doc.id)
    setDocForm({
      title: doc.title ?? '',
      type: doc.type ?? 'other',
      reference: doc.reference ?? '',
      issuedAt: doc.issuedAt ? calendarDay(doc.issuedAt) : '',
      expiresAt: doc.expiresAt ? calendarDay(doc.expiresAt) : '',
    })
    setShowDocModal(true)
  }

  const saveDocument = async () => {
    if (!emp || savingDoc) return
    setSavingDoc(true)
    const renewal = {
      reference: docForm.reference.trim() || null,
      issuedAt: docForm.issuedAt || null,
      expiresAt: docForm.expiresAt || null,
    }
    try {
      if (editingDocId) {
        // The attached file is never replaced in place — only its details change.
        const res = await ipc.employees.documents.update({
          id: editingDocId,
          title: docForm.title.trim() || undefined,
          type: docForm.type,
          ...renewal,
          performedBy: actor,
        })
        if (res?.success) {
          toast.success?.(t('empDocMetadataSavedOk'))
          setShowDocModal(false)
          setEditingDocId(null)
          setDocForm(emptyDocForm)
          load()
        } else complain(res, 'empDocSaveMetadataErr')
      } else {
        const res = await ipc.employees.documents.add({
          employeeId: emp.id,
          title: docForm.title.trim() || undefined,
          type: docForm.type,
          ...renewal,
          performedBy: actor,
        })
        if (res?.success) {
          toast.success?.(t('empDocAttachedOk'))
          setShowDocModal(false)
          setDocForm(emptyDocForm)
          load()
        } else if (!res?.canceled) complain(res, 'empDocSaveErr')
      }
    } catch (err) { failed(err, 'empDocSaveErr') }
    finally { setSavingDoc(false) }
  }

  const openDocument = async (documentId: string) => {
    try {
      const res = await ipc.employees.documents.open(documentId)
      if (res && !res.success) complain(res, 'empDocOpenErr')
    } catch (err) { failed(err, 'empDocOpenErr') }
  }

  const deleteDocument = (documentId: string) => {
    setConfirm({
      message: t('empDocConfirmDelete'),
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.documents.delete(documentId)
          if (res?.success) { toast.success?.(t('empDocDeletedOk')); load() }
          else complain(res, 'empDocDeleteErr')
        } catch (err) { failed(err, 'empDocDeleteErr') }
      }
    })
  }

  // ── Leave / PTO ─────────────────────────────────────────────────────────
  const saveLeave = async () => {
    if (!emp || savingLeave) return
    setSavingLeave(true)
    try {
      const res = await ipc.employees.leave.add({
        employeeId: emp.id,
        type: leaveForm.type,
        startDate: new Date(leaveForm.startDate).toISOString(),
        endDate: new Date(leaveForm.endDate).toISOString(),
        days: Number(leaveForm.days) || 0,
        reason: leaveForm.reason || null,
        performedBy: actor,
      })
      if (res?.success) { toast.success?.(t('empLeaveRequestedOk')); setShowLeaveModal(false); load() }
      else complain(res, 'empLeaveRequestErr')
    } catch (err) { failed(err, 'empLeaveRequestErr') }
    finally { setSavingLeave(false) }
  }

  const setLeaveStatus = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await ipc.employees.leave.setStatus(leaveId, status, actor)
      if (res?.success) {
        toast.success?.(t(status === 'approved' ? 'empLeaveApprovedOk' : 'empLeaveRejectedOk'))
        load()
      } else complain(res, 'empLeaveUpdateErr')
    } catch (err) { failed(err, 'empLeaveUpdateErr') }
  }

  const approveAllLeave = async () => {
    if (!emp) return
    const pending = emp.leaveRecords.filter(l => l.status === 'pending')
    if (!pending.length) return
    for (const l of pending) { try { await ipc.employees.leave.setStatus(l.id, 'approved', actor) } catch { /* skip */ } }
    toast.success?.(t('empLeaveBulkApproved', { count: pending.length }))
    load()
  }

  const deleteLeave = (leaveId: string) => {
    setConfirm({
      message: t('empLeaveConfirmDelete'),
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.leave.delete(leaveId)
          if (res?.success) { toast.success?.(t('empLeaveDeletedOk')); load() }
          else complain(res, 'empLeaveDeleteErr')
        } catch (err) { failed(err, 'empLeaveDeleteErr') }
      }
    })
  }

  // ── End Contract ──────────────────────────────────────────────────────────
  const endContract = async () => {
    if (!emp) return
    setSavingTerminate(true)
    try {
      const res = await ipc.employees.update(emp.id, {
        status: 'terminated',
        terminationDate: new Date(terminateForm.terminationDate).toISOString(),
        terminationNote: terminateForm.terminationNote || null,
        performedBy: actor,
      })
      if (res?.success) {
        toast.success?.(t('empContractEndedOk'))
        setShowTerminateModal(false)
        load()
      } else {
        complain(res, 'empContractEndErr')
      }
    } catch (err) { failed(err, 'empContractEndErr') }
    finally { setSavingTerminate(false) }
  }

  const [savingPerf, setSavingPerf] = useState(false)
  const savePerformance = async (score: number) => {
    if (!emp || savingPerf) return
    setSavingPerf(true)
    try {
      const res = await ipc.employees.update(emp.id, { performanceScore: score > 0 ? score : null, performedBy: actor })
      if (res?.success) { toast.success?.(t('empPerfUpdatedOk')); load() }
      else complain(res, 'empPerfUpdateErr')
    } catch (err) { failed(err, 'empPerfUpdateErr') }
    finally { setSavingPerf(false) }
  }

  const [reactivating, setReactivating] = useState(false)
  const reactivate = async () => {
    if (!emp) return
    setReactivating(true)
    try {
      const res = await ipc.employees.update(emp.id, {
        status: 'active',
        terminationDate: null,
        terminationNote: null,
        performedBy: actor,
      })
      if (res?.success) {
        toast.success?.(t('empReactivatedOk'))
        load()
      } else {
        complain(res, 'empReactivateErr')
      }
    } catch (err) { failed(err, 'empReactivateErr') }
    finally { setReactivating(false) }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const todayKey = localDayOffset(0)
  const todayAtt = emp?.attendance.find(a => calendarDay(a.date) === todayKey) ?? null

  const openAttendanceFor = (date: string, existing?: EmployeeAttendance | null) => {
    setAttForm({
      date,
      status: (existing?.status as AttendanceStatus) ?? 'present',
      checkIn: existing?.checkIn ? new Date(existing.checkIn).toTimeString().slice(0, 5) : '',
      checkOut: existing?.checkOut ? new Date(existing.checkOut).toTimeString().slice(0, 5) : '',
      notes: existing?.notes ?? ''
    })
    setShowAttModal(true)
  }

  /**
   * The last 90 days, newest last, each paired with the attendance recorded for it.
   *
   * Keys are local calendar days on both sides of the lookup, so a record logged on
   * the 5th lands on the 5th in every timezone.
   */
  const buildCalendar = () => {
    if (!emp) return []
    const map: Record<string, EmployeeAttendance> = {}
    for (const a of emp.attendance) map[calendarDay(a.date)] = a
    const days: { date: string; att: EmployeeAttendance | null }[] = []
    for (let i = 89; i >= 0; i--) {
      const key = localDayOffset(-i)
      days.push({ date: key, att: map[key] ?? null })
    }
    return days
  }

  const netPay = payForm.baseSalary + payForm.bonuses - payForm.deductions

  return {
    emp, loading, tab, setTab,
    // attendance
    showAttModal, setShowAttModal, attForm, setAttForm, savingAtt, saveAttendance,
    handleCheckIn, handleCheckOut, checkingIn, checkingOut, todayAtt, openAttendanceFor,
    // payroll
    showPayModal, setShowPayModal, payForm, setPayForm, savingPay, savePayroll, markPayrollPaid, netPay,
    // note
    showNoteModal, setShowNoteModal, noteText, setNoteText, savingNote, saveNote,
    // shifts
    showShiftModal, setShowShiftModal, shiftForm, setShiftForm, savingShift, saveShift, deleteShift,
    // overtime
    showOTModal, setShowOTModal, otForm, setOtForm, savingOT, saveOvertime, approveOvertime, revokeOvertime, deleteOvertime, approveAllOvertime,
    // documents
    showDocModal, setShowDocModal, docForm, setDocForm, editingDocId, savingDoc, saveDocument,
    openDocForAdd, openDocForEdit, openDocument, deleteDocument,
    // leave
    showLeaveModal, setShowLeaveModal, leaveForm, setLeaveForm, savingLeave, saveLeave, setLeaveStatus, deleteLeave, approveAllLeave,
    // confirm dialog
    confirm, setConfirm,
    // end contract
    showTerminateModal, setShowTerminateModal, terminateForm, setTerminateForm, savingTerminate, endContract,
    // reactivate
    reactivating, reactivate,
    // performance
    savingPerf, savePerformance,
    // misc
    buildCalendar, reload: load
  }
}
