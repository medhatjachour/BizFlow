/**
 * Role Permissions Settings
 * Admin screen to toggle per-role capabilities (discounts, voids, refunds,
 * profit visibility, etc.). Admin role is always full-access and locked.
 */

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { Shield, Loader2, Lock, RotateCcw, ListChecks, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  CAPABILITIES,
  ALL_CAPABILITIES,
  PLUGIN_ROLE_DEFAULTS,
  PLUGIN_PERMISSION_CATALOG,
  PLUGIN_ACCESS_CAPABILITIES,
  pluginRoleLabel,
  type PluginPermissionCatalog,
  type PluginId,
  type Capability,
} from '../../../../shared/permissions'
import PermissionMatrix from './PermissionMatrix'

type RoleInfo = { capabilities: Capability[]; isDefault: boolean; isWildcard: boolean }

const KERNEL_ROLES = ['admin', 'manager', 'member', 'finance', 'inventory', 'sales', 'cashier'] as const
const roleLabel = (r: string) => pluginRoleLabel(r)

// capability keys grouped for display
const GROUPS = ALL_CAPABILITIES.reduce((acc, cap) => {
  const g = CAPABILITIES[cap].group
  ;(acc[g] ??= []).push(cap)
  return acc
}, {} as Record<string, Capability[]>)

export default function RolePermissionsSettings({ pluginId = null }: { pluginId?: PluginId | null }) {
  const { can } = useAuth()
  const toast = useToast()
  const editable = can('manage_settings')
  const visibleGroups = Object.entries(GROUPS).filter(([group]) => !pluginId || group !== 'Plugin Access')
  const [catalogs, setCatalogs] = useState<PluginPermissionCatalog[]>([])
  const pluginCatalog = pluginId
    ? catalogs.find(catalog => catalog.id === pluginId) ?? PLUGIN_PERMISSION_CATALOG[pluginId]
    : null

  const [roles, setRoles] = useState<Record<string, RoleInfo>>({})
  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('manager')
  const scrollTopBeforeUpdateRef = useRef<number | null>(null)

  const captureMainScroll = () => {
    const main = document.getElementById('main-content')
    if (!main) return
    scrollTopBeforeUpdateRef.current = main.scrollTop
  }

  useLayoutEffect(() => {
    if (scrollTopBeforeUpdateRef.current === null) return
    const main = document.getElementById('main-content')
    if (!main) {
      scrollTopBeforeUpdateRef.current = null
      return
    }

    const nextTop = scrollTopBeforeUpdateRef.current
    requestAnimationFrame(() => {
      main.scrollTop = nextTop
      scrollTopBeforeUpdateRef.current = null
    })
  }, [roles, savingRole])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await (window as any).api?.permissions?.getRoles()
      setRoles(res ?? {})
    } catch {
      toast.error('Failed to load role permissions')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!pluginId) return
    void (window as any).api?.plugins?.getCatalog?.()
      .then((catalog: PluginPermissionCatalog[] | undefined) => setCatalogs(catalog ?? []))
      .catch(() => setCatalogs([]))
  }, [pluginId])

  async function persist(role: string, caps: Capability[]) {
    captureMainScroll()
    setSavingRole(role)
    try {
      await (window as any).api?.permissions?.setRole(role, caps)
      setRoles(prev => ({ ...prev, [role]: { ...prev[role], capabilities: caps, isDefault: false } }))
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save')
      void load()
    } finally {
      setSavingRole(null)
    }
  }

  function toggle(role: string, cap: Capability) {
    if (!editable) return
    const cur = roles[role]?.capabilities ?? []
    const next = cur.includes(cap) ? cur.filter(c => c !== cap) : [...cur, cap]
    void persist(role, next)
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
  }

  // Plugin roles are assignments on individual users, not global kernel roles.
  const roleKeys: string[] = (pluginId
    ? Object.keys(PLUGIN_ROLE_DEFAULTS[pluginId])
    : KERNEL_ROLES
  ).filter(role => roles[role] && role !== 'coffee_staff')

  const activeRole = roleKeys.includes(selected) ? selected : (roleKeys[0] ?? 'manager')
  const info = roles[activeRole]
  const wildcard = info?.isWildcard
  const enabledCount = wildcard ? ALL_CAPABILITIES.length : (info?.capabilities.length ?? 0)

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{pluginId ? 'Plugin Role Permissions' : 'Kernel Role Permissions'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pluginId ? 'Choose a plugin role, then switch its capabilities on or off. Changes save instantly.' : 'Choose a kernel role, then switch its shared capabilities on or off. Changes save instantly. Admin always has full access.'}
            {!editable && ' (read-only — needs the “Manage settings” permission)'}
          </p>
        </div>
      </div>

      {!pluginId && <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
        Plugin roles are assigned separately for each user. Open User Management from a plugin to manage access for that plugin; those assignments do not appear as global kernel roles here.
      </div>}

      {/* Role selector pills */}
      <div className="flex flex-wrap gap-2">
        {roleKeys.map(role => {
          const r = roles[role]
          const count = r.isWildcard ? ALL_CAPABILITIES.length : r.capabilities.length
          const isSel = role === activeRole
          return (
            <button key={role} type="button" onClick={() => setSelected(role)}
              className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all
                ${isSel
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'}`}>
              {r.isWildcard && <Lock size={12} className={isSel ? 'text-white/90' : 'text-red-500'} />}
              {roleLabel(role)}
              <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${isSel ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                {count}/{ALL_CAPABILITIES.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected role detail */}
      {info && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{roleLabel(activeRole)}</span>
              {wildcard ? (
                <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300"><Lock size={10} /> full access</span>
              ) : info.isDefault ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">default</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">customised</span>
              )}
              <span className="text-xs text-slate-400">· {enabledCount} of {ALL_CAPABILITIES.length} enabled</span>
            </div>
            <div className="flex items-center gap-3">
              {savingRole === activeRole && <Loader2 size={14} className="animate-spin text-blue-500" />}
              {editable && !wildcard && (
                <>
                  <button onClick={() => persist(activeRole, [...ALL_CAPABILITIES])}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                    <ListChecks size={12} /> Enable all
                  </button>
                  <button onClick={() => persist(activeRole, [])}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <RotateCcw size={12} /> Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          {wildcard ? (
            <div className="px-5 py-8 text-center">
              <Lock className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">The <b>Admin</b> role always has every permission and can’t be limited.</p>
            </div>
          ) : (
            <div className="min-w-0">
              {pluginCatalog ? (
                <PermissionMatrix
                  catalog={pluginCatalog}
                  capabilities={info.capabilities}
                  disabled={!editable}
                  onChange={capabilities => persist(activeRole, [...new Set([
                    ...capabilities,
                    PLUGIN_ACCESS_CAPABILITIES[pluginId!],
                  ])])}
                />
              ) : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleGroups.map(([group, caps]) => (
                  <div key={group} className="px-5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{group}</p>
                    <div className="space-y-1">
                      {caps.map(cap => {
                        const on = info.capabilities.includes(cap)
                        return (
                          <div key={cap}
                            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors ${editable ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer' : ''}`}
                            onClick={() => editable && toggle(activeRole, cap)}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                {on && <Check size={12} className="text-white" strokeWidth={3} />}
                              </span>
                              <span className={`text-sm break-words ${on ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{CAPABILITIES[cap].label}</span>
                            </div>
                            {/* toggle switch */}
                            <span role="switch" aria-checked={on}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${editable ? '' : 'opacity-60'}`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
