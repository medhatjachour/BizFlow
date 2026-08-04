// features/settings/users-roles/components/RolePermissionsSettings.tsx

import { useState, useMemo } from 'react'
import { Shield, Lock, Plus, Trash2 } from 'lucide-react'
import { useRoles } from '../hooks/useRoles'
import { usePermissions } from '../hooks/usePermissions'
import { RoleSelector } from './RoleSelector'
import { RoleSummaryCard } from './RoleSummaryCard'
import { CapabilityMatrix } from './CapabilityMatrix'
import { CreateRoleModal } from './CreateRoleModal'
import { LoadingState } from './states'
import { getRelevantCapabilities, getRoleMeta } from '../constants'
import { useToast } from '../../../../contexts/ToastContext'

export function RolePermissionsSettings() {
  const toast = useToast()
  const { canManageSettings } = usePermissions()
  const {
    roles, loading, savingRole, customRoleIds,
    persist, resetToDefaults, createCustomRole, deleteCustomRole,
  } = useRoles()

  const [selected, setSelected] = useState<string>('manager')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const roleKeys = Object.keys(roles)
  const activeRole = roleKeys.includes(selected) ? selected : (roleKeys[0] ?? 'manager')
  const info = roles[activeRole]
  const relevantCaps = useMemo(() => getRelevantCapabilities(), [])

  if (loading) return <LoadingState label="Loading role permissions…" />

  function toggle(cap: string) {
    if (!canManageSettings || !info || info.isWildcard) return
    const cur = info.capabilities ?? []
    const next = cur.includes(cap) ? cur.filter(c => c !== cap) : [...cur, cap]
    void persist(activeRole, next)
  }

  function enableAll() {
    void persist(activeRole, [...relevantCaps])
  }

  function clearAll() {
    void persist(activeRole, [])
  }

  function handleReset() {
    void resetToDefaults(activeRole)
  }

  async function handleDeleteCustom() {
    if (!customRoleIds.includes(activeRole)) return
    const ok = await deleteCustomRole(activeRole)
    if (ok) setSelected('manager')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Role Permissions</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a role, then toggle capabilities. Changes save instantly.
              {!canManageSettings && ' (read-only — needs "Manage settings" permission)'}
            </p>
          </div>
        </div>
      </div>

      {/* Role selector */}
      <RoleSelector
        roles={roles}
        customRoleIds={customRoleIds}
        selected={activeRole}
        onSelect={setSelected}
        onCreateNew={() => setShowCreateModal(true)}
        canCreate={canManageSettings}
      />

      {/* Selected role detail */}
      {info && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <RoleSummaryCard
            role={activeRole}
            info={info}
            saving={savingRole === activeRole}
            editable={canManageSettings}
            onReset={handleReset}
          />

          {info.isWildcard ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                The Admin role always has every permission and can't be limited.
              </p>
            </div>
          ) : (
            <>
              <CapabilityMatrix
                role={activeRole}
                enabledCaps={info.capabilities}
                editable={canManageSettings}
                onToggle={toggle}
                onEnableAll={enableAll}
                onClearAll={clearAll}
                onResetDefaults={handleReset}
              />

              {customRoleIds.includes(activeRole) && canManageSettings && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleDeleteCustom}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete custom role
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateRoleModal
          onSubmit={createCustomRole}
          onClose={() => setShowCreateModal(false)}
          existingRoleIds={[...Object.keys(roles)]}
        />
      )}
    </div>
  )
}
