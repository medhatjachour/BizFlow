// features/settings/users-roles/components/UserManagementSettings.tsx

import { useState, useMemo } from 'react'
import { UserPlus, Users as UsersIcon, Loader2 } from 'lucide-react'
import { useUsers } from '../hooks/useUsers'
import { useUserDialogs } from '../hooks/useUserDialogs'
import { useUserFilters } from '../hooks/useUserFilters'
import { usePermissions } from '../hooks/usePermissions'
import { UserStatsBar } from './UserStatsBar'
import { UsersTable } from './UsersTable'
import { UserFormModal } from './UserFormModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import { LoadingState, ErrorState } from './states'
import { computeUserStats } from '../utils'
import { useRoles } from '../hooks/useRoles'
import SmartDeleteDialog from '@renderer/components/SmartDeleteDialog'

export function UserManagementSettings() {
  const {
    users, loading, error, load,
    createUser, updateUser, changePassword, toggleActive,
    hardDeleteUser, deactivateUser,
  } = useUsers()
  const { roles, customRoleIds } = useRoles()
  const { dialog, checking, openAdd, openEdit, openPassword, openDelete, close } = useUserDialogs()
  const { canManageUsers } = usePermissions()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const {
    filters, pageItems, totalPages,
    setSearch, setRole, setStatus, setPage, setPageSize,
  } = useUserFilters(users)

  const stats = useMemo(() => computeUserStats(users), [users])

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function selectAll(ids: string[]) { setSelectedIds(ids) }

  if (loading) return <LoadingState label="Loading users…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage system users, roles, and access
            </p>
          </div>
        </div>
        {canManageUsers && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <UserStatsBar stats={stats} />

      {/* Table */}
      <UsersTable
        users={pageItems}
        filters={filters}
        totalPages={totalPages}
        onSearch={setSearch}
        onRoleChange={setRole}
        onStatusChange={setStatus}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onEdit={openEdit}
        onChangePassword={openPassword}
        onToggleActive={toggleActive}
        onDelete={openDelete}
        canManage={canManageUsers}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
      />

      {/* Dialogs */}
      {dialog.kind === 'add' && (
        <UserFormModal
          mode="add"
          onSubmit={createUser}
          onClose={close}
          customRoleIds={customRoleIds}
          rolesData={roles}
        />
      )}

      {dialog.kind === 'edit' && (
        <UserFormModal
          mode="edit"
          user={dialog.user}
          onSubmit={updateUser}
          onClose={close}
          customRoleIds={customRoleIds}
          rolesData={roles}
        />
      )}

      {dialog.kind === 'password' && (
        <ChangePasswordModal
          user={dialog.user}
          onSubmit={changePassword}
          onClose={close}
        />
      )}

      {dialog.kind === 'delete' && (
        <SmartDeleteDialog
          isOpen
          onClose={close}
          entityType="user"
          entityName={dialog.user.username}
          checkResult={dialog.check}
          onDelete={async () => {
            const ok = await hardDeleteUser(dialog.user.id)
            if (ok) close()
          }}
          onArchive={async () => {
            const ok = await deactivateUser(dialog.user.id)
            if (ok) close()
          }}
        />
      )}

      {checking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      )}
    </div>
  )
}
