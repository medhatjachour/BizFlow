import { Edit2, Lock, Shield, UserX, CheckCircle, XCircle } from 'lucide-react'
import type { PluginId } from '../../../../../../shared/permissions'
import type { User } from '../types'

type Props = {
  users: User[]
  pluginScope: PluginId | null
  pluginLabel?: string
  resolveRoleLabel: (user: User) => string
  resolveKernelRoleLabel: (role: string) => string
  onEdit: (user: User) => void
  onChangePassword: (user: User) => void
  onToggleActive: (user: User) => void
  onDelete: (user: User) => void
}

export default function UsersTable({
  users,
  pluginScope,
  pluginLabel,
  resolveRoleLabel,
  resolveKernelRoleLabel,
  onEdit,
  onChangePassword,
  onToggleActive,
  onDelete,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="w-full overflow-x-auto overflow-y-visible overscroll-x-contain">
        <table className="w-full min-w-[980px]">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
              {pluginScope ? `${pluginLabel} role` : 'Role'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Last Login</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No users found for the current scope.
              </td>
            </tr>
          )}
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 align-top">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.username.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{user.fullName || user.username}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 min-w-[180px]">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                  {resolveRoleLabel(user)}
                </span>
                {pluginScope && user.role !== 'member' && user.role !== 'admin' && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Kernel: {resolveKernelRoleLabel(user.role)}</p>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 min-w-[220px]">
                <div>{user.email || '-'}</div>
                <div>{user.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.isActive ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="w-4 h-4 mr-1" />Active
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <XCircle className="w-4 h-4 mr-1" />Inactive
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[150px]">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Edit user" aria-label={`Edit ${user.username}`}><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onChangePassword(user)} className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300" title="Change password" aria-label={`Change password for ${user.username}`}><Lock className="w-4 h-4" /></button>
                  <button onClick={() => onToggleActive(user)} className={user.isActive ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'} title={user.isActive ? 'Deactivate' : 'Activate'} aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.username}`}><Shield className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(user)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Deactivate or delete user" aria-label={`Delete or deactivate ${user.username}`}><UserX className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
