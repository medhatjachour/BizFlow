/**
 * User Management Settings Component
 * Allows admin to manage system users, roles, and passwords
 */

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Edit2, Shield, Lock, Eye, EyeOff, CheckCircle, XCircle, UserX } from 'lucide-react'
import SmartDeleteDialog from '../../components/SmartDeleteDialog'
import { useAuth } from '../../../hooks/useAuth'
import logger from '../../../../shared/utils/logger'

interface User {
  id: string
  username: string
  fullName: string | null
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
  lastLogin: string | null
}

interface NewUser {
  username: string
  password: string
  confirmPassword: string
  fullName: string
  email: string
  phone: string
  role: string
}

type RoleMeta = {
  label: string
  description: string
  color: string
}

const BUNDLED_PLUGIN_FLAGS: Record<string, boolean> = {
  commerce: typeof __PLUGIN_COMMERCE__ !== 'undefined' && __PLUGIN_COMMERCE__,
  bakery: typeof __PLUGIN_BAKERY__ !== 'undefined' && __PLUGIN_BAKERY__,
  restaurant: typeof __PLUGIN_RESTAURANT__ !== 'undefined' && __PLUGIN_RESTAURANT__,
  warehouse: typeof __PLUGIN_WAREHOUSE__ !== 'undefined' && __PLUGIN_WAREHOUSE__,
  clinic: typeof __PLUGIN_CLINIC__ !== 'undefined' && __PLUGIN_CLINIC__,
  vet: typeof __PLUGIN_VET__ !== 'undefined' && __PLUGIN_VET__,
}

const ALL_ROLE_META: Record<string, RoleMeta> = {
  admin: {
    label: 'Admin',
    description: 'Full system access - can manage users, settings, and all modules',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  },
  manager: {
    label: 'Manager',
    description: 'Cross-module management access for operations and reporting',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },

  // Commerce roles
  sales: {
    label: 'Sales',
    description: 'Commerce sales operations (POS and sales pages)',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  inventory: {
    label: 'Inventory',
    description: 'Commerce inventory and product stock control',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  finance: {
    label: 'Finance',
    description: 'Financial review and reconciliation access',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  },

  // Clinic
  clinic_staff: {
    label: 'Clinic Staff',
    description: 'Clinic day-to-day operations (patients, sessions, appointments)',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
  },

  // Vet
  vet_staff: {
    label: 'Vet Staff',
    description: 'Veterinary clinic operations (patients, sessions, appointments)',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200'
  },

  // Bakery
  bakery_staff: {
    label: 'Bakery Staff',
    description: 'Bakery production, recipes, and waste operations',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },

  // Restaurant
  restaurant_staff: {
    label: 'Restaurant Staff',
    description: 'Restaurant tables, reservations, and dine-in workflow',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
  },

  // Warehouse
  warehouse_staff: {
    label: 'Warehouse Staff',
    description: 'Warehouse transfer and location stock operations',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
  },
}

const CORE_ROLES = ['admin', 'manager']

function getPluginScopedRoles(): string[] {
  const roles: string[] = []
  if (BUNDLED_PLUGIN_FLAGS.commerce) roles.push('sales', 'inventory', 'finance')
  if (BUNDLED_PLUGIN_FLAGS.clinic) roles.push('clinic_staff')
  if (BUNDLED_PLUGIN_FLAGS.vet) roles.push('vet_staff')
  if (BUNDLED_PLUGIN_FLAGS.bakery) roles.push('bakery_staff')
  if (BUNDLED_PLUGIN_FLAGS.restaurant) roles.push('restaurant_staff')
  if (BUNDLED_PLUGIN_FLAGS.warehouse) roles.push('warehouse_staff')
  return roles
}

function getAvailableRoles(): string[] {
  return [...CORE_ROLES, ...getPluginScopedRoles()]
}

function getDefaultRole(): string {
  const roles = getAvailableRoles()
  if (roles.includes('sales')) return 'sales'
  return roles.includes('manager') ? 'manager' : 'admin'
}

function getRoleMeta(role: string): RoleMeta {
  return ALL_ROLE_META[role] ?? {
    label: role,
    description: 'Custom role',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  }
}

export default function UserManagementSettings() {
  const { user } = useAuth()
  const availableRoles = getAvailableRoles()
  const defaultRole = getDefaultRole()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteCheckResult, setDeleteCheckResult] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  
  const [newUser, setNewUser] = useState<NewUser>({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phone: '',
    role: defaultRole
  })

  const [passwordChange, setPasswordChange] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.api.users.getAll()
      if (result.success) {
        setUsers(result.data)
      }
    } catch (error) {
      logger.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleAddUser = async () => {
    if (newUser.password !== newUser.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters long!')
      return
    }

    try {
      const result = await window.api.users.create({
        username: newUser.username,
        password: newUser.password,
        fullName: newUser.fullName || null,
        email: newUser.email || null,
        phone: newUser.phone || null,
        role: newUser.role
      })

      if (result.success) {
        await loadUsers()
        setShowAddModal(false)
        setNewUser({
          username: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          email: '',
          phone: '',
          role: defaultRole
        })
        alert('User created successfully!')
      } else {
        alert(`Failed to create user: ${result.error}`)
      }
    } catch (error) {
      logger.error('Failed to create user:', error)
      alert('Failed to create user')
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    try {
      const result = await window.api.users.update(selectedUser.id, {
        fullName: selectedUser.fullName,
        email: selectedUser.email,
        phone: selectedUser.phone,
        role: selectedUser.role,
        isActive: selectedUser.isActive
      })

      if (result.success) {
        await loadUsers()
        setShowEditModal(false)
        setSelectedUser(null)
        alert('User updated successfully!')
      } else {
        alert(`Failed to update user: ${result.error}`)
      }
    } catch (error) {
      logger.error('Failed to update user:', error)
      alert('Failed to update user')
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (passwordChange.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!')
      return
    }

    try {
      const result = await window.api.users.changePassword(selectedUser.id, passwordChange.newPassword)

      if (result.success) {
        setShowPasswordModal(false)
        setSelectedUser(null)
        setPasswordChange({ newPassword: '', confirmPassword: '' })
        alert('Password changed successfully!')
      } else {
        alert(`Failed to change password: ${result.error}`)
      }
    } catch (error) {
      logger.error('Failed to change password:', error)
      alert('Failed to change password')
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const result = await window.api.users.update(user.id, {
        isActive: !user.isActive
      })

      if (result.success) {
        await loadUsers()
      }
    } catch (error) {
      logger.error('Failed to toggle user status:', error)
    }
  }

  const handleDeleteUser = async (user: User) => {
    try {
      // Check if user can be deleted
      const result = await window.electron.ipcRenderer.invoke('delete:check-user', {
        userId: user.id
      })
      
      if (result.success) {
        setUserToDelete(user)
        setDeleteCheckResult(result.data)
        setShowDeleteDialog(true)
      } else {
        alert('Failed to check user dependencies')
      }
    } catch (error) {
      logger.error('Failed to check user:', error)
      alert('Failed to check user')
    }
  }
  
  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:hard-delete-user', {
        userId: userToDelete.id
      })
      
      if (result.success) {
        await loadUsers()
        alert('User deleted successfully')
      } else {
        alert(result.error || 'Failed to delete user')
      }
    } catch (error) {
      logger.error('Failed to delete user:', error)
      alert('Failed to delete user')
    }
  }
  
  const handleDeactivateUser = async () => {
    if (!userToDelete) return
    
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:deactivate-user', {
        userId: userToDelete.id,
        deactivatedBy: user?.id,
      })
      
      if (result.success) {
        await loadUsers()
        alert('User deactivated successfully')
      } else {
        alert('Failed to deactivate user')
      }
    } catch (error) {
      logger.error('Failed to deactivate user:', error)
      alert('Failed to deactivate user')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {user.username.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.fullName || user.username}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleMeta(user.role).color}`}>
                    {getRoleMeta(user.role).label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  <div>{user.email || '-'}</div>
                  <div>{user.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <XCircle className="w-4 h-4 mr-1" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowEditModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowPasswordModal(true)
                      }}
                      className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                      title="Change password"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={user.isActive 
                        ? "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      }
                      title={user.isActive ? "Deactivate" : "Activate"}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Deactivate or delete user"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Descriptions */}
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="username"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="John Doe"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="user@example.com"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="+1-555-0000"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>{getRoleMeta(role).label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {getRoleMeta(newUser.role).description}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create User
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewUser({
                    username: '',
                    password: '',
                    confirmPassword: '',
                    fullName: '',
                    email: '',
                    phone: '',
                    role: defaultRole
                  })
                }}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={selectedUser.username}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Username cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={selectedUser.fullName || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, fullName: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedUser.email || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, email: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, role: e.target.value } : prev)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>{getRoleMeta(role).label}</option>
                  ))}
                  {!availableRoles.includes(selectedUser.role) && (
                    <option value={selectedUser.role}>{selectedUser.role} (legacy)</option>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={selectedUser.isActive}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, isActive: e.target.checked } : prev)}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                  Account is active
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Update User
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Change Password for {selectedUser.username}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordChange.confirmPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setSelectedUser(null)
                  setPasswordChange({ newPassword: '', confirmPassword: '' })
                }}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Smart Delete Dialog */}
      <SmartDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setUserToDelete(null)
          setDeleteCheckResult(null)
        }}
        entityType="user"
        entityName={userToDelete?.username || ''}
        checkResult={deleteCheckResult}
        onDelete={handleConfirmDelete}
        onArchive={handleDeactivateUser}
      />
    </div>
  )
}
