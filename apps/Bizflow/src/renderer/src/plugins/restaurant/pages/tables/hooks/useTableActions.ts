import { useState } from 'react'
import { TableFormData, QuickSeatFormData, TransferFormData, MergeFormData } from '../types'

export function useTableActions(onSuccess: () => void) {
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const saveTable = async (data: TableFormData, editingId?: string) => {
    setSubmitting(true)
    setActionError(null)
    try {
      if (editingId) {
        await window.api.restaurant.updateTable({
          id: editingId,
          number: Number(data.number),
          name: data.name || undefined,
          capacity: Number(data.capacity),
          section: data.section || 'Main Hall',
          shape: data.shape,
          status: data.status
        })
      } else {
        await window.api.restaurant.createTable({
          number: Number(data.number),
          name: data.name || undefined,
          capacity: Number(data.capacity),
          section: data.section || 'Main Hall',
          shape: data.shape
        })
      }
      onSuccess()
      return true
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save table')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const changeStatus = async (id: string, status: string) => {
    try {
      await window.api.restaurant.updateTable({ id, status })
      onSuccess()
    } catch (err: any) {
      alert(err?.message || 'Failed to update table status')
    }
  }

  const quickSeat = async (data: QuickSeatFormData) => {
    setSubmitting(true)
    setActionError(null)
    try {
      await window.api.restaurant.openOrder({
        tableId: data.tableId,
        guestCount: Number(data.guestCount || 1),
        serverName: data.serverName || 'Staff',
        notes: data.notes || ''
      })
      onSuccess()
      return true
    } catch (err: any) {
      setActionError(err?.message || 'Failed to seat table')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const transferTable = async (data: TransferFormData) => {
    setSubmitting(true)
    setActionError(null)
    try {
      await window.api.restaurant.transferTable(data)
      onSuccess()
      return true
    } catch (err: any) {
      setActionError(err?.message || 'Failed to transfer table')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const mergeTables = async (data: MergeFormData) => {
    setSubmitting(true)
    setActionError(null)
    try {
      await window.api.restaurant.mergeTables(data)
      onSuccess()
      return true
    } catch (err: any) {
      setActionError(err?.message || 'Failed to merge tables')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to remove this table from the floor plan?')) return
    try {
      await window.api.restaurant.deleteTable(id)
      onSuccess()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete table')
    }
  }

  return {
    submitting,
    actionError,
    setActionError,
    saveTable,
    changeStatus,
    quickSeat,
    transferTable,
    mergeTables,
    deleteTable
  }
}