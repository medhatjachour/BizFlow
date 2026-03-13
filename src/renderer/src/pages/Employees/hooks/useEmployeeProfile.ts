import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import logger from '../../../../../shared/utils/logger'
import type { EmployeeProfile, EmployeeAttendance, AttendanceStatus } from '../types'

export type ProfileTab = 'overview' | 'attendance' | 'shifts' | 'overtime' | 'payroll' | 'activity' | 'documents'

export function useEmployeeProfile(id: string | undefined) {
  const navigate = useNavigate()
  const toast = useToast()

  const [emp, setEmp] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ProfileTab>('overview')

  // ── Attendance modal ─────────────────────────────────────────────────────
  const [showAttModal, setShowAttModal] = useState(false)
  const [attForm, setAttForm] = useState({
    date: new Date().toISOString().split('T')[0],
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

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // ── Check-in/out loading guard ────────────────────────────────────────────
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // ── Shift modal ──────────────────────────────────────────────────────────
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().split('T')[0],
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
    date: new Date().toISOString().split('T')[0],
    hours: 1,
    reason: '',
    multiplier: 1.5
  })
  const [savingOT, setSavingOT] = useState(false)

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
        notes: attForm.notes || null
      })
      if (res?.success) { toast.success?.('Attendance saved'); setShowAttModal(false); load() }
      else toast.error?.(res?.message || 'Failed to save attendance')
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSavingAtt(false) }
  }

  const handleCheckIn = async () => {
    if (!emp || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await ipc.employees.attendance.checkIn(emp.id)
      if (res?.success) { toast.success?.('Checked in'); load() }
      else toast.error?.(res?.message || 'Failed')
    } finally { setCheckingIn(false) }
  }

  const handleCheckOut = async () => {
    if (!emp || checkingOut) return
    setCheckingOut(true)
    try {
      const res = await ipc.employees.attendance.checkOut(emp.id)
      if (res?.success) { toast.success?.('Checked out'); load() }
      else toast.error?.(res?.message || 'Failed')
    } finally { setCheckingOut(false) }
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  const savePayroll = async () => {
    if (!emp) return
    setSavingPay(true)
    try {
      const res = await ipc.employees.payroll.upsert({ employeeId: emp.id, ...payForm })
      if (res?.success) { toast.success?.('Payroll saved'); setShowPayModal(false); load() }
      else toast.error?.(res?.message || 'Failed to save payroll')
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSavingPay(false) }
  }

  // ── Activity / note ───────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!emp || !noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await ipc.employees.activity.add({
        employeeId: emp.id, action: 'note_added', details: noteText.trim()
      })
      if (res?.success) { toast.success?.('Note added'); setShowNoteModal(false); setNoteText(''); load() }
      else toast.error?.(res?.message || 'Failed')
    } catch (err: any) { toast.error?.(err.message) }
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
      if (res?.success) { toast.success?.('Shift added'); setShowShiftModal(false); load() }
      else toast.error?.(res?.message || 'Failed to add shift')
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSavingShift(false) }
  }

  const deleteShift = (shiftId: string) => {
    setConfirm({
      message: 'Delete this shift? This action cannot be undone.',
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.shifts.delete(shiftId)
          if (res?.success) { toast.success?.('Shift deleted'); load() }
          else toast.error?.(res?.message || 'Failed to delete shift')
        } catch (err: any) { toast.error?.(err.message) }
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
      if (res?.success) { toast.success?.('Overtime logged'); setShowOTModal(false); load() }
      else toast.error?.(res?.message || 'Failed to log overtime')
    } catch (err: any) { toast.error?.(err.message) }
    finally { setSavingOT(false) }
  }

  const approveOvertime = async (overtimeId: string) => {
    try {
      const res = await ipc.employees.overtime.approve(overtimeId)
      if (res?.success) { toast.success?.('Overtime approved'); load() }
      else toast.error?.(res?.message || 'Failed to approve')
    } catch (err: any) { toast.error?.(err.message) }
  }

  const deleteOvertime = (overtimeId: string) => {
    setConfirm({
      message: 'Delete this overtime record? This action cannot be undone.',
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await ipc.employees.overtime.delete(overtimeId)
          if (res?.success) { toast.success?.('Overtime deleted'); load() }
          else toast.error?.(res?.message || 'Failed to delete')
        } catch (err: any) { toast.error?.(err.message) }
      }
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toDateKey = (d: string | Date) =>
    (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0]

  const todayKey = new Date().toISOString().split('T')[0]
  const todayAtt = emp?.attendance.find(a => toDateKey(a.date) === todayKey) ?? null

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

  const buildCalendar = () => {
    if (!emp) return []
    const map: Record<string, EmployeeAttendance> = {}
    for (const a of emp.attendance) map[toDateKey(a.date)] = a
    const days: { date: string; att: EmployeeAttendance | null }[] = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
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
    showPayModal, setShowPayModal, payForm, setPayForm, savingPay, savePayroll, netPay,
    // note
    showNoteModal, setShowNoteModal, noteText, setNoteText, savingNote, saveNote,
    // shifts
    showShiftModal, setShowShiftModal, shiftForm, setShiftForm, savingShift, saveShift, deleteShift,
    // overtime
    showOTModal, setShowOTModal, otForm, setOtForm, savingOT, saveOvertime, approveOvertime, deleteOvertime,
    // confirm dialog
    confirm, setConfirm,
    // misc
    buildCalendar, reload: load
  }
}
