// features/settings/users-roles/components/UsersTable.tsx

import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import type { User, UserFilters, RoleId } from '../types'
import { UserTableRow } from './UserTableRow'
import { EmptyState } from './states'
import { getAvailableBuiltinRoles, getRoleMeta, PAGE_SIZE_OPTIONS } from '../constants'

interface Props {
  users: User[]
  filters: UserFilters
  totalPages: number
  onSearch: (s: string) => void
  onRoleChange: (r: UserFilters['role']) => void
  onStatusChange: (s: UserFilters['status']) => void
  onPageChange: (p: number) => void
  onPageSizeChange: (ps: number) => void
  onEdit: (u: User) => void
  onChangePassword: (u: User) => void
  onToggleActive: (u: User) => void
  onDelete: (u: User) => void
  canManage: boolean
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
}

export function UsersTable({
  users, filters, totalPages,
  onSearch, onRoleChange, onStatusChange, onPageChange, onPageSizeChange,
  onEdit, onChangePassword, onToggleActive, onDelete, canManage,
  selectedIds, onToggleSelect, onSelectAll,
}: Props) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const availableRoles = useMemo(() => getAvailableBuiltinRoles(), [])
  const allOnPageSelected = users.length > 0 && users.every(u => selectedIds.includes(u.id))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => { setLocalSearch(e.target.value); onSearch(e.target.value) }}
            placeholder="Search by name, username, email, phone…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filters.role}
            onChange={(e) => onRoleChange(e.target.value as RoleId | 'all')}
            className="text-sm px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="all">All roles</option>
            {availableRoles.map(r => <option key={r} value={r}>{getRoleMeta(r).label}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={(e) => onStatusChange(e.target.value as UserFilters['status'])}
            className="text-sm px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <EmptyState title="No users found" hint="Try adjusting your filters or add a new user." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={() => onSelectAll(allOnPageSelected ? [] : users.map(u => u.id))}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(u => (
                <UserTableRow
                  key={u.id}
                  user={u}
                  selected={selectedIds.includes(u.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onChangePassword={onChangePassword}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                  canManage={canManage}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Page {filters.page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(filters.page - 1)}
              disabled={filters.page <= 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(filters.page + 1)}
              disabled={filters.page >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
