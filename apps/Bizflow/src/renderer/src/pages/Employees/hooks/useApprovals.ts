import { useState, useEffect, useCallback } from 'react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../contexts/AuthContext'
import type { ApprovalsData, PendingLeaveApproval, PendingOvertimeApproval } from '../types'

/**
 * useApprovals — team-wide pending leave & overtime approvals.
 *
 * Provides the data plus the actions needed to review requests from the HR
 * dashboard (approve / reject individual items, or approve everything).
 */
export function useApprovals() {
  const toast = useToast()
  const { user } = useAuth()
  const actor = user?.username ?? user?.id ?? undefined

  const [data, setData] = useState<ApprovalsData>({ leave: [], overtime: [] })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await ipc.employees.approvals.pending()
      setData({ leave: res?.leave ?? [], overtime: res?.overtime ?? [] })
    } catch {
      setData({ leave: [], overtime: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pendingCount = data.leave.length + data.overtime.length

  const withBusy = async (id: string, fn: () => Promise<any>) => {
    if (busyId) return
    setBusyId(id)
    try {
      const res = await fn()
      if (res?.success) {
        toast.success?.(res?.message || 'Updated')
        load()
      } else {
        toast.error?.(res?.message || 'Action failed')
      }
    } catch (err: any) {
      toast.error?.(err?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const approveLeave = (id: string) =>
    withBusy(id, () => ipc.employees.leave.setStatus(id, 'approved', actor))

  const rejectLeave = (id: string) =>
    withBusy(id, () => ipc.employees.leave.setStatus(id, 'rejected', actor))

  const approveOvertime = (id: string) =>
    withBusy(id, () => ipc.employees.overtime.approve(id, actor))

  const runBulk = async (items: { id: string }[], fn: (id: string) => Promise<any>) => {
    if (bulkBusy || items.length === 0) return
    setBulkBusy(true)
    let ok = 0
    for (const item of items) {
      try {
        const res = await fn(item.id)
        if (res?.success) ok++
      } catch { /* keep going */ }
    }
    if (ok > 0) toast.success?.(`Approved ${ok} of ${items.length} request${items.length !== 1 ? 's' : ''}`)
    setBulkBusy(false)
    load()
  }

  const approveAllLeave = (leave: PendingLeaveApproval[]) => runBulk(leave, id => ipc.employees.leave.setStatus(id, 'approved', actor))
  const approveAllOvertime = (overtime: PendingOvertimeApproval[]) => runBulk(overtime, id => ipc.employees.overtime.approve(id, actor))

  return {
    leave: data.leave,
    overtime: data.overtime,
    pendingCount,
    loading,
    busyId,
    bulkBusy,
    reload: load,
    approveLeave,
    rejectLeave,
    approveOvertime,
    approveAllLeave,
    approveAllOvertime,
  }
}
