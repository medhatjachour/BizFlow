// features/settings/users-roles/hooks/useUsers.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import type { User, NewUserPayload, UpdateUserPayload } from '../types'
import { useToast } from '../../../../contexts/ToastContext'
import logger from '@/shared/utils/logger'

interface UsersApi {
  getAll: () => Promise<{ success: boolean; data?: User[]; error?: string }>
  create: (payload: NewUserPayload) => Promise<{ success: boolean; error?: string }>
  update: (id: string, patch: UpdateUserPayload) => Promise<{ success: boolean; error?: string }>
  changePassword: (id: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

function getApi(): UsersApi | undefined {
  return (window as any).api?.users
}

export function useUsers() {
  const toast = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  const load = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      if (!api) { setError('Users API not available'); setLoading(false); return }
      const res = await api.getAll()
      if (id !== reqId.current) return
      if (res.success && res.data) {
        setUsers(res.data)
      } else {
        setError(res.error ?? 'Failed to load users')
        toast.error(res.error ?? 'Failed to load users')
      }
    } catch (e) {
      logger.error('useUsers.load', e)
      setError('Failed to load users')
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const createUser = useCallback(async (payload: NewUserPayload): Promise<boolean> => {
    try {
      const api = getApi()
      if (!api) { toast.error('Users API not available'); return false }
      const res = await api.create(payload)
      if (res.success) {
        toast.success('User created successfully')
        await load()
        return true
      }
      toast.error(res.error ?? 'Failed to create user')
      return false
    } catch (e) {
      logger.error('useUsers.create', e)
      toast.error('Failed to create user')
      return false
    }
  }, [load, toast])

  const updateUser = useCallback(async (id: string, patch: UpdateUserPayload): Promise<boolean> => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } as User : u))
    try {
      const api = getApi()
      if (!api) { toast.error('Users API not available'); await load(); return false }
      const res = await api.update(id, patch)
      if (res.success) {
        toast.success('User updated')
        await load()
        return true
      }
      toast.error(res.error ?? 'Failed to update user')
      await load()
      return false
    } catch (e) {
      logger.error('useUsers.update', e)
      toast.error('Failed to update user')
      await load()
      return false
    }
  }, [load, toast])

  const changePassword = useCallback(async (id: string, newPassword: string): Promise<boolean> => {
    try {
      const api = getApi()
      if (!api) { toast.error('Users API not available'); return false }
      const res = await api.changePassword(id, newPassword)
      if (res.success) {
        toast.success('Password changed')
        return true
      }
      toast.error(res.error ?? 'Failed to change password')
      return false
    } catch (e) {
      logger.error('useUsers.changePassword', e)
      toast.error('Failed to change password')
      return false
    }
  }, [toast])

  const toggleActive = useCallback(async (user: User): Promise<boolean> => {
    return updateUser(user.id, { isActive: !user.isActive })
  }, [updateUser])

  const hardDeleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const res = await (window as any).electron?.ipcRenderer?.invoke('delete:hard-delete-user', { userId })
      if (res?.success) {
        toast.success('User deleted successfully')
        await load()
        return true
      }
      toast.error(res?.error ?? 'Failed to delete user')
      return false
    } catch (e) {
      logger.error('useUsers.hardDelete', e)
      toast.error('Failed to delete user')
      return false
    }
  }, [load, toast])

  const deactivateUser = useCallback(async (userId: string, deactivatedBy?: string): Promise<boolean> => {
    try {
      const res = await (window as any).electron?.ipcRenderer?.invoke('delete:deactivate-user', { userId, deactivatedBy })
      if (res?.success) {
        toast.success('User deactivated successfully')
        await load()
        return true
      }
      toast.error('Failed to deactivate user')
      return false
    } catch (e) {
      logger.error('useUsers.deactivate', e)
      toast.error('Failed to deactivate user')
      return false
    }
  }, [load, toast])

  return {
    users, loading, error, load,
    createUser, updateUser, changePassword, toggleActive,
    hardDeleteUser, deactivateUser,
  }
}
