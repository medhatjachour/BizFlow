import { useState } from 'react'
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import SmartDeleteDialog from '../../../components/SmartDeleteDialog'
import { useToast } from '../../../contexts/ToastContext'
import type { PluginId } from '../../../../../shared/permissions'
import { BUNDLED_PLUGIN_FLAGS } from './constants'
import { useUserManagement } from './hooks/useUserManagement'
import type { NewUser, User } from './types'
import { getAvailableRoles, getDefaultRole, getPluginRoleLabel, getRoleMeta, getScopedPlugin } from './utils'
import PluginRoleSelects from './components/PluginRoleSelects'
import UsersTable from './components/UsersTable'

export default function UserManagementSettings({ pluginId = null }: { pluginId?: PluginId | null }) {
  const toast = useToast()
  const availableRoles = getAvailableRoles()
  const defaultRole = getDefaultRole()
  const pluginScope = pluginId && BUNDLED_PLUGIN_FLAGS[pluginId] ? pluginId : null
  const scopedPlugin = getScopedPlugin(pluginScope)

  const {
    users,
    loading,
    refreshing,
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
  } = useUserManagement()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phone: '',
    role: defaultRole,
    pluginRoles: {}
  })

  const [passwordChange, setPasswordChange] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const displayedUsers = pluginScope
    ? users.filter(account => account.role === 'admin' || !!account.pluginRoles[pluginScope])
    : users

  const resetCreateForm = () => {
    setNewUser({
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      phone: '',
      role: defaultRole,
      pluginRoles: {}
    })
  }

  const handleAddUser = async () => {
    if (pluginScope && !newUser.pluginRoles[pluginScope]) {
      toast.warning(`Choose a ${scopedPlugin?.label ?? 'plugin'} role before creating this user.`)
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    const result = await addUser(newUser, Boolean(pluginScope))
    if (result.success) {
      setShowAddModal(false)
      resetCreateForm()
      toast.success('User created successfully.')
      return
    }

    toast.error(`Failed to create user: ${result.error}`)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    const result = await updateUser(selectedUser)
    if (result.success) {
      setShowEditModal(false)
      setSelectedUser(null)
      toast.success('User updated successfully.')
      return
    }

    toast.error(`Failed to update user: ${result.error}`)
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (passwordChange.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    const result = await changePassword(selectedUser, passwordChange.newPassword)
    if (result.success) {
      setShowPasswordModal(false)
      setSelectedUser(null)
      setPasswordChange({ newPassword: '', confirmPassword: '' })
      toast.success('Password changed successfully.')
      return
    }

    toast.error(`Failed to change password: ${result.error}`)
  }

  const handleToggleActive = async (account: User) => {
    await toggleActive(account)
  }

  const handleDeleteUser = async (account: User) => {
    const result = await checkDelete(account)
    if (!result.success) {
      toast.error(result.error || 'Failed to check user dependencies')
    }
  }

  const handleConfirmDelete = async () => {
    const result = await confirmDelete()
    if (result.success) {
      toast.success('User deleted successfully.')
      return
    }

    toast.error(result.error || 'Failed to delete user')
  }

  const handleDeactivateUser = async () => {
    const result = await deactivateUser()
    if (result.success) {
      toast.success('User deactivated successfully.')
      return
    }

    toast.error(result.error || 'Failed to deactivate user')
  }

  if (loading && users.length === 0) {
    return <div className="text-center py-8">Loading users...</div>
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {pluginScope ? `${scopedPlugin?.label} team` : 'User Management'}
            </h2>
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {pluginScope
              ? `Assign ${scopedPlugin?.label} roles and review each team member's access.`
              : 'Manage system users, roles, and permissions'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          {pluginScope ? `Add ${scopedPlugin?.label} user` : 'Add User'}
        </button>
      </div>

      {pluginScope && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Team members</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{displayedUsers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active accounts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{displayedUsers.filter(account => account.isActive).length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Access model</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Role-based plugin access</p>
          </div>
        </div>
      )}

      <UsersTable
        users={displayedUsers}
        pluginScope={pluginScope}
        pluginLabel={scopedPlugin?.label}
        resolveRoleLabel={(account) => getPluginRoleLabel(account, pluginScope)}
        resolveKernelRoleLabel={(role) => getRoleMeta(role).label}
        onEdit={(account) => {
          setSelectedUser(account)
          setShowEditModal(true)
        }}
        onChangePassword={(account) => {
          setSelectedUser(account)
          setShowPasswordModal(true)
        }}
        onToggleActive={handleToggleActive}
        onDelete={handleDeleteUser}
      />

      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Role Permissions</h3>
        <div className="space-y-2">
          {availableRoles.map((role) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded ${getRoleMeta(role).color}`}>
                {getRoleMeta(role).label}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{getRoleMeta(role).description}</span>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add New User</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="username"
                  autoComplete="off"
                />
              </div>

              <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 p-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input type="text" value={newUser.fullName} onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="John Doe" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="user@example.com" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input type="tel" value={newUser.phone} onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="+1-555-0000" autoComplete="off" />
              </div>

              {!pluginScope && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kernel role *</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                    {availableRoles.map((role) => (<option key={role} value={role}>{getRoleMeta(role).label}</option>))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getRoleMeta(newUser.role).description}</p>
                </div>
              )}

              <div className="md:col-span-2">
                <PluginRoleSelects value={newUser.pluginRoles} onChange={(pluginRoles) => setNewUser(prev => ({ ...prev, pluginRoles }))} pluginScope={pluginScope} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleAddUser} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Create User</button>
              <button onClick={() => { setShowAddModal(false); resetCreateForm() }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Edit User</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input type="text" value={selectedUser.username} disabled className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Username cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input type="text" value={selectedUser.fullName || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, fullName: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, email: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input type="tel" value={selectedUser.phone || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              {!pluginScope && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select value={selectedUser.role} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, role: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                    {availableRoles.map((role) => (<option key={role} value={role}>{getRoleMeta(role).label}</option>))}
                    {!availableRoles.includes(selectedUser.role) && (<option value={selectedUser.role}>{selectedUser.role} (legacy)</option>)}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <PluginRoleSelects value={selectedUser.pluginRoles ?? {}} onChange={(pluginRoles) => setSelectedUser(prev => prev ? { ...prev, pluginRoles } : prev)} pluginScope={pluginScope} />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={selectedUser.isActive} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, isActive: e.target.checked } : prev)} className="w-4 h-4 text-primary rounded" />
                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">Account is active</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdateUser} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Update User</button>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null) }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Change Password for {selectedUser.username}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordChange.confirmPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleChangePassword} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">Change Password</button>
              <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setPasswordChange({ newPassword: '', confirmPassword: '' }) }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <SmartDeleteDialog
        isOpen={showDeleteDialog}
        onClose={resetDeleteDialog}
        entityType="user"
        entityName={userToDelete?.username || ''}
        checkResult={deleteCheckResult}
        onDelete={handleConfirmDelete}
        onArchive={handleDeactivateUser}
      />
    </div>
  )
}
