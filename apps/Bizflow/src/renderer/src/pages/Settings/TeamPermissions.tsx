/**
 * Team & Permissions — the Settings -> Users tab.
 * Unified page: scope switcher (System | enabled plugins), team stats, user
 * management and per-role permission editing in one place, plus a per-user
 * access preview so admins can verify exactly what a role unlocks.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, LayoutGrid, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  PLUGIN_ROLE_DEFAULTS,
  PLUGIN_PERMISSION_CATALOG,
  type PluginId,
} from '../../../../shared/permissions'
import { BUNDLED_PLUGIN_FLAGS } from './userMangement/constants'
import UserManagementSettings from './userMangement'
import RolePermissionsSettings, { type RolesMap } from './RolePermissionsSettings'
import UserAccessPreview from './UserAccessPreview'
import { countRoleUsers } from './permissionsUtils'
import type { User } from './userMangement/types'

const PLUGIN_ROUTES: PluginId[] = ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee']

export default function TeamPermissions({ enabledPlugins }: { enabledPlugins: PluginId[] }) {
  const { can } = useAuth()
  const [searchParams] = useSearchParams()

  // ── Resolve the initial permission scope like the rest of the app ────────
  const bundledPlugins = PLUGIN_ROUTES.filter(id => BUNDLED_PLUGIN_FLAGS[id])
  const requestedPlugin = searchParams.get('plugin')
  const activePlugin = document.body.dataset.plugin
  const lastPlugin = localStorage.getItem('bizflow:lastPlugin')
  const onlyParam = searchParams.get('only')
  const validOnly = onlyParam && PLUGIN_ROUTES.includes(onlyParam as PluginId) ? onlyParam as PluginId : null
  const pluginContext = ([requestedPlugin, activePlugin, lastPlugin, bundledPlugins.length === 1 ? bundledPlugins[0] : null]
    .find((value): value is PluginId => !!value && PLUGIN_ROUTES.includes(value as PluginId)) ?? null)

  const initialScope = useMemo<PluginId | null>(() => {
    if (pluginContext && enabledPlugins.includes(pluginContext)) return pluginContext
    if (validOnly && enabledPlugins.includes(validOnly)) return validOnly
    if (enabledPlugins.length === 1) return enabledPlugins[0]
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [permPlugin, setPermPlugin] = useState<PluginId | null>(initialScope)
  const [roles, setRoles] = useState<RolesMap | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [previewUser, setPreviewUser] = useState<User | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [roleRes, userRes] = await Promise.all([
          (window as any).api?.permissions?.getRoles?.().catch(() => ({})),
          (window as any).api?.users?.getAll?.().catch(() => ({ success: true, data: [] })),
        ])
        if (cancelled) return
        setRoles(roleRes ?? {})
        const list = userRes && Array.isArray(userRes.data) ? userRes.data : Array.isArray(userRes) ? userRes : []
        setUsers(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const scopedUsers = useMemo(() => {
    if (!permPlugin) return users
    return users.filter(u => u.role === 'admin' || !!u.pluginRoles?.[permPlugin])
  }, [users, permPlugin])

  const roleKeys = useMemo(() => {
    const base = permPlugin ? Object.keys(PLUGIN_ROLE_DEFAULTS[permPlugin]) : ['admin', 'manager', 'member', 'finance', 'inventory', 'sales', 'cashier']
    return base.filter(role => roles?.[role] && role !== 'coffee_staff')
  }, [permPlugin, roles])

  const customisedCount = roleKeys.filter(role => roles?.[role] && !roles[role].isDefault && !roles[role].isWildcard).length

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header + scope switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Team &amp; Permissions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {permPlugin
              ? `Manage who works in ${PLUGIN_PERMISSION_CATALOG[permPlugin]?.label ?? permPlugin} and what each role can do.`
              : 'Manage system users, kernel roles and plugin access across the workspace.'}
          </p>
        </div>
        {enabledPlugins.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button
              onClick={() => setPermPlugin(null)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${permPlugin === null
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Shield size={13} /> System
            </button>
            {enabledPlugins.map(id => (
              <button
                key={id}
                onClick={() => setPermPlugin(id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${permPlugin === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <LayoutGrid size={13} /> {PLUGIN_PERMISSION_CATALOG[id]?.label ?? id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{permPlugin ? 'Team members' : 'Total accounts'}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{scopedUsers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active accounts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{scopedUsers.filter(u => u.isActive).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{permPlugin ? 'Plugin roles' : 'System roles'}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{roleKeys.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Customised roles</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{customisedCount}</p>
        </div>
      </div>

      {/* Users + Roles */}
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 items-start">
        <div className="min-w-0">
          <UserManagementSettings pluginId={permPlugin} onViewAccess={setPreviewUser} />
        </div>
        <div className="min-w-0">
          <RolePermissionsSettings
            pluginId={permPlugin}
            roles={roles}
            onRolesChange={setRoles}
            roleUsage={role => countRoleUsers(users, role, permPlugin)}
          />
        </div>
      </div>

      {!can('manage_users') && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          You can view permissions but need the “Manage user accounts” permission to add or edit users.
        </p>
      )}

      {previewUser && (
        <UserAccessPreview user={previewUser} roles={roles ?? {}} onClose={() => setPreviewUser(null)} />
      )}
    </div>
  )
}
