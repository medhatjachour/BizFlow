import { useState } from 'react'
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import SmartDeleteDialog from '../../../components/SmartDeleteDialog'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useToast } from '../../../contexts/ToastContext'
import type { PluginId } from '../../../../../shared/permissions'
import { BUNDLED_PLUGIN_FLAGS } from './constants'
import { useUserManagement } from './hooks/useUserManagement'
import type { NewUser, User } from './types'
import {
  getAvailableRoles,
  getDefaultRole,
  getPluginRoleLabel,
  getRoleMeta,
  getScopedPluginLabel
} from './utils'
import PluginRoleSelects from './components/PluginRoleSelects'
import UsersTable from './components/UsersTable'

export default function UserManagementSettings({ pluginId = null }: { pluginId?: PluginId | null }) {
  const toast = useToast()
  const { t, language } = useLanguage()
  const availableRoles = getAvailableRoles()
  const defaultRole = getDefaultRole()
  const pluginScope = pluginId && BUNDLED_PLUGIN_FLAGS[pluginId] ? pluginId : null
  const scopedPluginLabel = getScopedPluginLabel(pluginScope, language)

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
      toast.warning(t('umChoosePluginRole', { plugin: scopedPluginLabel }))
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error(t('umPasswordMismatch'))
      return
    }

    if (newUser.password.length < 6) {
      toast.error(t('umPasswordTooShort'))
      return
    }

    const result = await addUser(newUser, Boolean(pluginScope))
    if (result.success) {
      setShowAddModal(false)
      resetCreateForm()
      toast.success(t('umCreated'))
      return
    }

    toast.error(t('umCreateFailed', { error: result.error ?? '' }))
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    const result = await updateUser(selectedUser)
    if (result.success) {
      setShowEditModal(false)
      setSelectedUser(null)
      toast.success(t('umUpdated'))
      return
    }

    toast.error(t('umUpdateFailed', { error: result.error ?? '' }))
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error(t('umPasswordMismatch'))
      return
    }

    if (passwordChange.newPassword.length < 6) {
      toast.error(t('umPasswordTooShort'))
      return
    }

    const result = await changePassword(selectedUser, passwordChange.newPassword)
    if (result.success) {
      setShowPasswordModal(false)
      setSelectedUser(null)
      setPasswordChange({ newPassword: '', confirmPassword: '' })
      toast.success(t('umPasswordChanged'))
      return
    }

    toast.error(t('umPasswordChangeFailed', { error: result.error ?? '' }))
  }

  const handleToggleActive = async (account: User) => {
    await toggleActive(account)
  }

  const handleDeleteUser = async (account: User) => {
    const result = await checkDelete(account)
    if (!result.success) {
      toast.error(t(result.errorKey))
    }
  }

  const handleConfirmDelete = async () => {
    const result = await confirmDelete()
    if (result.success) {
      toast.success(t('umDeleted'))
      return
    }

    toast.error(t(result.errorKey))
  }

  const handleDeactivateUser = async () => {
    const result = await deactivateUser()
    if (result.success) {
      toast.success(t('umDeactivated'))
      return
    }

    toast.error(t(result.errorKey))
  }

  if (loading && users.length === 0) {
    return <div className="text-center py-8">{t('umLoading')}</div>
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {pluginScope ? t('umTitlePlugin', { plugin: scopedPluginLabel }) : t('umTitle')}
            </h2>
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {pluginScope ? t('umSubtitlePlugin', { plugin: scopedPluginLabel }) : t('umSubtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          {pluginScope ? t('umAddPlugin', { plugin: scopedPluginLabel }) : t('umAdd')}
        </button>
      </div>

      {pluginScope && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('umStatMembers')}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{displayedUsers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('umStatActive')}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{displayedUsers.filter(account => account.isActive).length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('umStatAccess')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{t('umStatAccessValue')}</p>
          </div>
        </div>
      )}

      <UsersTable
        users={displayedUsers}
        pluginScope={pluginScope}
        pluginLabel={scopedPluginLabel}
        resolveRoleLabel={(account) => getPluginRoleLabel(account, pluginScope, language)}
        resolveKernelRoleLabel={(role) => getRoleMeta(role, language).label}
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
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('umRolesHeading')}</h3>
        <div className="space-y-2">
          {availableRoles.map((role) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded ${getRoleMeta(role, language).color}`}>
                {getRoleMeta(role, language).label}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">{getRoleMeta(role, language).description}</span>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('umAddTitle')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umUsernameRequired')}</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder={t('umUsernamePlaceholder')}
                  autoComplete="off"
                />
              </div>

              <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 p-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umPasswordRequired')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder={t('umPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umConfirmPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder={t('umConfirmPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umFullName')}</label>
                <input type="text" value={newUser.fullName} onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder={t('umFullNamePlaceholder')} autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umEmail')}</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder={t('umEmailPlaceholder')} autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umPhone')}</label>
                <input type="tel" value={newUser.phone} onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder={t('umPhonePlaceholder')} autoComplete="off" />
              </div>

              {!pluginScope && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umKernelRole')}</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                    {availableRoles.map((role) => (<option key={role} value={role}>{getRoleMeta(role, language).label}</option>))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getRoleMeta(newUser.role, language).description}</p>
                </div>
              )}

              <div className="md:col-span-2">
                <PluginRoleSelects value={newUser.pluginRoles} onChange={(pluginRoles) => setNewUser(prev => ({ ...prev, pluginRoles }))} pluginScope={pluginScope} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleAddUser} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">{t('umCreate')}</button>
              <button onClick={() => { setShowAddModal(false); resetCreateForm() }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">{t('umCancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('umEditTitle')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umUsername')}</label>
                <input type="text" value={selectedUser.username} disabled className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('umUsernameLocked')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umFullName')}</label>
                <input type="text" value={selectedUser.fullName || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, fullName: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umEmail')}</label>
                <input type="email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, email: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umPhone')}</label>
                <input type="tel" value={selectedUser.phone || ''} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" autoComplete="off" />
              </div>

              {!pluginScope && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umRole')}</label>
                  <select value={selectedUser.role} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, role: e.target.value } : prev)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                    {availableRoles.map((role) => (<option key={role} value={role}>{getRoleMeta(role, language).label}</option>))}
                    {!availableRoles.includes(selectedUser.role) && (<option value={selectedUser.role}>{t('umLegacyRole', { role: selectedUser.role })}</option>)}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <PluginRoleSelects value={selectedUser.pluginRoles ?? {}} onChange={(pluginRoles) => setSelectedUser(prev => prev ? { ...prev, pluginRoles } : prev)} pluginScope={pluginScope} />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={selectedUser.isActive} onChange={(e) => setSelectedUser(prev => prev ? { ...prev, isActive: e.target.checked } : prev)} className="w-4 h-4 text-primary rounded" />
                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">{t('umAccountActive')}</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdateUser} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">{t('umUpdate')}</button>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null) }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">{t('umCancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('umChangePasswordTitle', { username: selectedUser.username })}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umNewPassword')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder={t('umPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('umConfirmNewPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordChange.confirmPassword}
                    onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white pr-10"
                    placeholder={t('umConfirmNewPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleChangePassword} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">{t('umChangePassword')}</button>
              <button onClick={() => { setShowPasswordModal(false); setSelectedUser(null); setPasswordChange({ newPassword: '', confirmPassword: '' }) }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">{t('umCancel')}</button>
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
