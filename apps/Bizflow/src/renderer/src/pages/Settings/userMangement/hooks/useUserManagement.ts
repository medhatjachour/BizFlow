import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import logger from '../../../../../../shared/utils/logger'
import type { NewUser, User } from '../types'

/**
 * Destructive actions report an i18n key rather than a message so the caller
 * can render it in the active language.
 */
type DeleteActionResult = { success: true } | { success: false; errorKey: string }

export function useUserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteCheckResult, setDeleteCheckResult] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const loadUsers = useCallback(async (opts: { keepLayout?: boolean } = {}) => {
    const keepLayout = opts.keepLayout ?? hasLoadedRef.current
    try {
      if (keepLayout) setRefreshing(true)
      else setLoading(true)

      const result = await window.api.users.getAll()
      if (result.success) {
        setUsers(result.data)
      }
    } catch (error) {
      logger.error('Failed to load users:', error)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers({ keepLayout: false })
  }, [loadUsers])

  const addUser = async (payload: NewUser, scoped: boolean) => {
    const result = await window.api.users.create({
      username: payload.username,
      password: payload.password,
      fullName: payload.fullName || null,
      email: payload.email || null,
      phone: payload.phone || null,
      role: scoped ? 'member' : payload.role,
      pluginRoles: payload.pluginRoles,
    })

    if (result.success) {
      await loadUsers({ keepLayout: true })
    }

    return result
  }

  const updateUser = async (selectedUser: User) => {
    const result = await window.api.users.update(selectedUser.id, {
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      phone: selectedUser.phone,
      role: selectedUser.role,
      pluginRoles: selectedUser.pluginRoles,
      isActive: selectedUser.isActive,
    })

    if (result.success) {
      await loadUsers({ keepLayout: true })
    }

    return result
  }

  const changePassword = async (selectedUser: User, newPassword: string) => {
    return window.api.users.changePassword(selectedUser.id, newPassword)
  }

  const toggleActive = async (account: User) => {
    const result = await window.api.users.update(account.id, {
      isActive: !account.isActive,
    })

    if (result.success) {
      await loadUsers({ keepLayout: true })
    }

    return result
  }

  const checkDelete = async (account: User): Promise<DeleteActionResult> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:check-user', {
        userId: account.id,
      })

      if (result.success) {
        setUserToDelete(account)
        setDeleteCheckResult(result.data)
        setShowDeleteDialog(true)
        return { success: true }
      }

      logger.error('Failed to check user dependencies:', result.error)
      return { success: false, errorKey: 'umDeleteCheckFailed' }
    } catch (error) {
      logger.error('Failed to check user:', error)
      return { success: false, errorKey: 'umDeleteCheckFailed' }
    }
  }

  const confirmDelete = async (): Promise<DeleteActionResult> => {
    if (!userToDelete) return { success: false, errorKey: 'umNoSelection' }

    try {
      const result = await window.electron.ipcRenderer.invoke('delete:hard-delete-user', {
        userId: userToDelete.id,
      })

      if (!result.success) {
        logger.error('Failed to delete user:', result.error)
        return { success: false, errorKey: 'umDeleteFailed' }
      }

      await loadUsers({ keepLayout: true })
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete user:', error)
      return { success: false, errorKey: 'umDeleteFailed' }
    }
  }

  const deactivateUser = async (): Promise<DeleteActionResult> => {
    if (!userToDelete) return { success: false, errorKey: 'umNoSelection' }

    try {
      const result = await window.electron.ipcRenderer.invoke('delete:deactivate-user', {
        userId: userToDelete.id,
        deactivatedBy: user?.id,
      })

      if (!result.success) {
        logger.error('Failed to deactivate user:', result.error)
        return { success: false, errorKey: 'umDeactivateFailed' }
      }

      await loadUsers({ keepLayout: true })
      return { success: true }
    } catch (error) {
      logger.error('Failed to deactivate user:', error)
      return { success: false, errorKey: 'umDeactivateFailed' }
    }
  }

  const resetDeleteDialog = () => {
    setShowDeleteDialog(false)
    setUserToDelete(null)
    setDeleteCheckResult(null)
  }

  return {
    users,
    loading,
    refreshing,
    loadUsers,
    addUser,
    updateUser,
    changePassword,
    toggleActive,
    checkDelete,
    confirmDelete,
    deactivateUser,
    showDeleteDialog,
    deleteCheckResult,
    userToDelete,
    resetDeleteDialog,
  }
}
