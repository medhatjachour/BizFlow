// features/settings/users-roles/hooks/useUserDialogs.ts

import { useState, useCallback } from 'react'
import type { DialogKind, User, DeleteCheckResult } from '../types'
import logger from '@/shared/utils/logger'

export function useUserDialogs() {
  const [dialog, setDialog] = useState<DialogKind>({ kind: 'none' })
  const [checking, setChecking] = useState(false)

  const openAdd = useCallback(() => setDialog({ kind: 'add' }), [])
  const openEdit = useCallback((u: User) => setDialog({ kind: 'edit', user: u }), [])
  const openPassword = useCallback((u: User) => setDialog({ kind: 'password', user: u }), [])
  const close = useCallback(() => setDialog({ kind: 'none' }), [])

  const openDelete = useCallback(async (u: User) => {
    setChecking(true)
    try {
      const res = await (window as any).electron?.ipcRenderer?.invoke('delete:check-user', { userId: u.id })
      if (res?.success) {
        setDialog({ kind: 'delete', user: u, check: res.data as DeleteCheckResult })
      }
    } catch (e) {
      logger.error('useUserDialogs.openDelete', e)
    } finally {
      setChecking(false)
    }
  }, [])

  return { dialog, checking, openAdd, openEdit, openPassword, openDelete, close }
}
