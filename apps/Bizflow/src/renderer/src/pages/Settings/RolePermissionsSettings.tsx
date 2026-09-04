/**
 * Role Permissions Settings
 * Admin screen to toggle per-role capabilities (discounts, voids, refunds,
 * profit visibility, etc.). Admin role is always full-access and locked.
 */

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react'
import { Shield, Loader2, Lock, RotateCcw, ListChecks, Check, ShieldCheck, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  CAPABILITIES,
  ALL_CAPABILITIES,
  PLUGIN_ROLE_DEFAULTS,
  PLUGIN_PERMISSION_CATALOG,
  PLUGIN_ACCESS_CAPABILITIES,
  type PluginPermissionCatalog,
  type PluginId,
  type Capability,
} from '../../../../shared/permissions'
import PermissionMatrix from './PermissionMatrix'

type RoleInfo = { capabilities: Capability[]; isDefault: boolean; isWildcard: boolean }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', member: 'Member', finance: 'Finance',
  inventory: 'Inventory', sales: 'Sales', cashier: 'Cashier',
  coffee_cashier: 'Cashier',
  coffee_inventory_manager: 'Inventory Manager',
  coffee_shift_manager: 'Shift Manager',
  coffee_manager: 'Coffee Manager',
}
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r.charAt(0).toUpperCase() + r.slice(1)
const KERNEL_ROLES = ['admin', 'manager', 'member', 'finance', 'inventory', 'sales', 'cashier'] as const

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
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-xs font-medium">Loading permissions…</p>
      </div>
    )
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
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex items-start gap-3.5">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{pluginId ? 'Plugin Role Permissions' : 'Kernel Role Permissions'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {pluginId
              ? 'Choose a plugin role, then switch its capabilities on or off. Changes save instantly.'
              : 'Choose a kernel role, then switch its shared capabilities on or off. Admin always has full access.'}
            {!editable && (
              <span className="font-semibold text-amber-600 dark:text-amber-400 ms-1">
                (read-only — needs the “Manage settings” permission)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Info notice for kernel roles */}
      {!pluginId && (
        <div className="rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-xs text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <span>
            Plugin roles are assigned separately for each user. Open User Management from a plugin to manage access for that plugin; those assignments do not appear as global kernel roles here.
          </span>
        </div>
      )}

      {/* Role selector pills */}
      <div className="flex flex-wrap gap-2">
        {roleKeys.map(role => {
          const r = roles[role]
          const count = r.isWildcard ? ALL_CAPABILITIES.length : r.capabilities.length
          const isSel = role === activeRole

          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelected(role)}
              className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold border transition-all select-none ${
                isSel
                  ? 'bg-primary border-primary text-white shadow-sm ring-2 ring-primary/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-primary/50'
              }`}
            >
              {r.isWildcard && (
                <Lock size={12} className={isSel ? 'text-white' : 'text-rose-500'} />
              )}
              <span>{roleLabel(role)}</span>
              <span
                className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                  isSel
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}/{ALL_CAPABILITIES.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected role detail card */}
      {info && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden min-w-0">
          {/* Card action header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {roleLabel(activeRole)}
              </span>

              {wildcard ? (
                <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 font-semibold">
                  <Lock size={10} /> full access
                </span>
              ) : info.isDefault ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                  default
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  customised
                </span>
              )}

              <span className="text-xs text-slate-400 dark:text-slate-500">
                · {enabledCount} of {ALL_CAPABILITIES.length} enabled
              </span>
            </div>

            {/* Right side tools */}
            <div className="flex items-center gap-3">
              {savingRole === activeRole && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving…</span>
                </div>
              )}

              {editable && !wildcard && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => persist(activeRole, [...ALL_CAPABILITIES])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-all"
                  >
                    <ListChecks size={13} /> Enable all
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(activeRole, [])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                  >
                    <RotateCcw size={13} /> Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card Body */}
          {wildcard ? (
            <div className="px-6 py-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Admin Role is Protected
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                The <b>Admin</b> role always has every permission and can’t be limited or restricted.
              </p>
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
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/80">
                  {visibleGroups.map(([group, caps]) => (
                    <div key={group} className="px-5 py-4 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {caps.map(cap => {
                          const on = info.capabilities.includes(cap)
                          return (
                            <div
                              key={cap}
                              onClick={() => editable && toggle(activeRole, cap)}
                              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                                on
                                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : 'border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                              } ${editable ? 'cursor-pointer select-none' : 'opacity-75 cursor-default'}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                    on
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-transparent'
                                  }`}
                                >
                                  <Check size={10} strokeWidth={3} />
                                </span>
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    on
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {CAPABILITIES[cap].label}
                                </span>
                              </div>

                              {/* RTL/LTR Aware Toggle Switch */}
                              <span
                                role="switch"
                                aria-checked={on}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors ${
                                  on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                } ${editable ? '' : 'opacity-60'}`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                                    on
                                      ? 'ltr:translate-x-4 rtl:-translate-x-4'
                                      : 'translate-x-0.5'
                                  }`}
                                />
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}