// features/settings/users-roles/components/UserTableRow.tsx

import { Edit2, KeyRound, Power, Trash2 } from 'lucide-react'
import type { User } from '../types'
import { getRoleMeta } from '../constants'
import { formatLastLogin, initialsOf } from '../utils'

interface Props {
  user: User
  selected: boolean
  onToggleSelect: (id: string) => void
  onEdit: (u: User) => void
  onChangePassword: (u: User) => void
  onToggleActive: (u: User) => void
  onDelete: (u: User) => void
  canManage: boolean
}

export function UserTableRow({
  user, selected, onToggleSelect, onEdit, onChangePassword, onToggleActive, onDelete, canManage,
}: Props) {
  const meta = getRoleMeta(user.role)
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(user.id)}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          aria-label={`Select ${user.username}`}
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
            {initialsOf(user)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user.fullName || user.username}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
          {meta.label}
        </span>
      </td>

      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        <div>{user.email || '—'}</div>
        {user.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
      </td>

      <td className="px-4 py-3">
        {user.isActive ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
          </span>
        )}
      </td>

      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
        {formatLastLogin(user.lastLogin)}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(user)}
            title="Edit"
            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangePassword(user)}
            title="Change password"
            className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleActive(user)}
            title={user.isActive ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700
              ${user.isActive ? 'text-red-600' : 'text-emerald-600'}`}
          >
            <Power className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(user)}
            title="Delete"
            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            disabled={!canManage}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
