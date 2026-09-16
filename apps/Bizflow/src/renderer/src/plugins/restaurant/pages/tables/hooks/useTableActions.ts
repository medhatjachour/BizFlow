import { useCallback, useState } from 'react'
import { TableFormData, TransferFormData, MergeFormData } from '../types'

/**
 * Floor-plan write operations. Every failure surfaces through `actionError` so the
 * page can show an in-app message instead of a blocking native dialog.
 */
export function useTableActions(onSuccess: () => void) {
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const saveTable = useCallback(
    async (data: TableFormData, editingId?: string) => {
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
    },
    [onSuccess]
  )

  const changeStatus = useCallback(
    async (id: string, status: string) => {
      setActionError(null)
      try {
        await window.api.restaurant.updateTable({ id, status })
        onSuccess()
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to update table status')
        return false
      }
    },
    [onSuccess]
  )

  const transferTable = useCallback(
    async (data: TransferFormData) => {
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
    },
    [onSuccess]
  )

  const mergeTables = useCallback(
    async (data: MergeFormData) => {
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
    },
    [onSuccess]
  )

  const deleteTable = useCallback(
    async (id: string) => {
      setActionError(null)
      try {
        await window.api.restaurant.deleteTable(id)
        onSuccess()
        return true
      } catch (err: any) {
        setActionError(err?.message || 'Failed to delete table')
        return false
      }
    },
    [onSuccess]
  )

  return {
    submitting,
    actionError,
    setActionError,
    saveTable,
    changeStatus,
    transferTable,
    mergeTables,
    deleteTable
  }
}
