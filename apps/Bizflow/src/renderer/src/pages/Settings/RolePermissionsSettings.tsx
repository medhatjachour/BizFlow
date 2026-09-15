/**
 * Roles & Permissions settings.
 *
 * Scoped role manager: when `pluginId` is set it edits that plugin's roles,
 * otherwise the kernel's. A role can only ever hold capabilities from its own
 * scope, so nothing edited here can widen access in another plugin.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Shield, Loader2, Lock, RotateCcw, Plus, Trash2, Users, Info,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  catalogForScope,
  capabilitiesForScope,
  presetCapabilities,
  type PluginId,
  type Capability,
  type Scope,
} from '../../../../shared/permissions'
import { pluginNameAr, roleDescriptionAr, roleDisplayLabelAr } from '../../../../shared/permissionsAr'
import PermissionMatrix from './PermissionMatrix'

type ManagedRole = {
  key: string
  label: string
  scope: Scope
  description: string | null
  capabilities: Capability[]
  isBuiltIn: boolean
  isSystem: boolean
  isDefault: boolean
  isWildcard: boolean
  userCount?: number
}

function errorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : ''
  // Electron wraps handler errors — keep only the useful tail.
  return raw.replace(/^Error invoking remote method '[^']+':\s*/, '').trim() || fallback
}

export default function RolePermissionsSettings({ pluginId = null }: { pluginId?: PluginId | null }) {
  const { can, refreshPermissions } = useAuth()
  const toast = useToast()
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const editable = can('manage_settings')
  const scope: Scope = pluginId ?? 'kernel'
  const catalog = useMemo(() => catalogForScope(scope), [scope])
  const scopeCapabilities = useMemo(() => new Set(capabilitiesForScope(scope)), [scope])
  const scopeCapabilityCount = scopeCapabilities.size

  const [roles, setRoles] = useState<ManagedRole[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRoles(await window.api.roles.list(scope))
    } catch (error) {
      toast.error(errorMessage(error, t('rpLoadFailed')))
    } finally {
      setLoading(false)
    }
  }, [scope, toast, t])

  useEffect(() => { void load() }, [load])

  const active = roles.find(role => role.key === selectedKey) ?? roles[0] ?? null

  /** Built-in names are translated; a role the owner renamed keeps their wording. */
  const displayLabel = (role: { key: string; label: string }): string =>
    isAr ? roleDisplayLabelAr(role.key, role.label) : role.label

  useEffect(() => {
    if (active && active.key !== selectedKey) setSelectedKey(active.key)
  }, [active, selectedKey])

  /** Optimistic write — roll back and reload if the main process rejects it. */
  async function persist(key: string, patch: { label?: string; capabilities?: Capability[] }) {
    const previous = roles
    setRoles(current => current.map(role => (role.key === key ? { ...role, ...patch, isDefault: false } : role)))
    setSavingKey(key)
    try {
      const updated = await window.api.roles.update(key, patch)
      setRoles(current => current.map(role => (role.key === key ? { ...updated, userCount: role.userCount } : role)))
      await refreshPermissions()
    } catch (error) {
      setRoles(previous)
      toast.error(errorMessage(error, t('rpSaveFailed')))
    } finally {
      setSavingKey(null)
    }
  }

  async function createRole() {
    const label = draftName.trim()
    if (!label) return
    setCreating(true)
    try {
      const created = await window.api.roles.create({
        label,
        scope,
        capabilities: presetCapabilities(scope, 'viewer'),
      })
      setRoles(current => [...current, { ...created, userCount: 0 }])
      setSelectedKey(created.key)
      setDraftName('')
      toast.success(t('rpCreated', { name: created.label }))
    } catch (error) {
      toast.error(errorMessage(error, t('rpCreateFailed')))
    } finally {
      setCreating(false)
    }
  }

  async function removeRole(role: ManagedRole) {
    try {
      await window.api.roles.remove(role.key)
      setRoles(current => current.filter(item => item.key !== role.key))
      setSelectedKey(null)
      toast.success(t('rpDeleted', { name: role.label }))
    } catch (error) {
      toast.error(errorMessage(error, t('rpDeleteFailed')))
    }
  }

  async function resetRole(role: ManagedRole) {
    setSavingKey(role.key)
    try {
      const updated = await window.api.roles.reset(role.key)
      setRoles(current => current.map(item => (item.key === role.key ? { ...updated, userCount: item.userCount } : item)))
      await refreshPermissions()
      toast.success(t('rpReset', { name: role.label }))
    } catch (error) {
      toast.error(errorMessage(error, t('rpResetFailed')))
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium">{t('rpLoading')}</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {pluginId
              ? t('rpPluginTitle', { plugin: isAr ? pluginNameAr(pluginId, catalog.label) : catalog.label })
              : t('rpCoreTitle')}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t('rpIntro')}
            {!editable && (
              <span className="ms-1 font-semibold text-amber-600 dark:text-amber-400">
                {t('rpReadOnly')}
              </span>
            )}
          </p>
        </div>
      </header>

      {!pluginId && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            {t('rpKernelNote')}
          </span>
        </div>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Role list */}
        <aside className="min-w-0 space-y-2">
          <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {roles.map(role => {
              const isSelected = role.key === active?.key
              const granted = role.isWildcard
                ? scopeCapabilityCount
                : role.capabilities.filter(capability => scopeCapabilities.has(capability)).length
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedKey(role.key)}
                  title={isAr ? roleDescriptionAr(role.key, role.description) : role.description ?? undefined}
                  className={`w-full rounded-xl px-3 py-2.5 text-start transition ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {role.isWildcard && <Lock size={11} className={isSelected ? 'text-white' : 'text-rose-500'} />}
                    <span className="truncate text-sm font-semibold">{displayLabel(role)}</span>
                  </span>
                  <span
                    className={`mt-0.5 flex items-center gap-2 text-[11px] ${
                      isSelected ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{t('rpPermissionsCount', { granted, total: scopeCapabilityCount })}</span>
                    {role.userCount !== undefined && (
                      <span className="inline-flex items-center gap-0.5">
                        <Users size={10} />{role.userCount}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {editable && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-800">
              <input
                value={draftName}
                onChange={event => setDraftName(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && void createRole()}
                placeholder={t('rpNewPlaceholder')}
                className="h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => void createRole()}
                disabled={!draftName.trim() || creating}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:opacity-90 disabled:opacity-40"
                aria-label={t('rpCreateAria')}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
          )}
        </aside>

        {/* Role detail */}
        {active && (
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-700/80">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {editable && !active.isSystem ? (
                  <input
                    value={active.label}
                    onChange={event =>
                      setRoles(current =>
                        current.map(role => (role.key === active.key ? { ...role, label: event.target.value } : role))
                      )
                    }
                    onBlur={event => {
                      const label = event.target.value.trim()
                      if (label && label !== roles.find(r => r.key === active.key)?.label) {
                        void persist(active.key, { label })
                      }
                    }}
                    className="min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-primary dark:text-white dark:hover:border-slate-600"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{displayLabel(active)}</span>
                )}

                {active.isSystem ? (
                  <Badge tone="rose"><Lock size={10} /> {t('rpBadgeFull')}</Badge>
                ) : active.isBuiltIn ? (
                  <Badge tone="slate">{t('rpBadgeBuiltIn')}</Badge>
                ) : (
                  <Badge tone="primary">{t('rpBadgeCustom')}</Badge>
                )}
                {!active.isSystem && !active.isDefault && <Badge tone="primary">{t('rpBadgeCustomised')}</Badge>}
              </div>

              <div className="flex items-center gap-3">
                {savingKey === active.key && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Loader2 size={13} className="animate-spin" /> {t('rpSaving')}
                  </span>
                )}
                {editable && !active.isSystem && active.isBuiltIn && !active.isDefault && (
                  <button
                    type="button"
                    onClick={() => void resetRole(active)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RotateCcw size={13} /> {t('rpResetAction')}
                  </button>
                )}
                {editable && !active.isBuiltIn && (
                  <button
                    type="button"
                    onClick={() => void removeRole(active)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                  >
                    <Trash2 size={13} /> {t('rpDeleteAction')}
                  </button>
                )}
              </div>
            </div>

            {active.isSystem ? (
              <div className="space-y-3 px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40">
                  <Lock className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('rpAdminProtected')}</p>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('rpAdminProtectedLead')} <b>{t('rpAdminRoleName')}</b> {t('rpAdminProtectedTail')}
                </p>
              </div>
            ) : (
              <PermissionMatrix
                catalog={catalog}
                scope={scope}
                capabilities={active.capabilities}
                disabled={!editable}
                onChange={next => {
                  // The matrix only reports capabilities it owns; anything the
                  // role holds outside this scope (e.g. a kernel role's plugin
                  // access) must survive the edit.
                  const managed = new Set(catalog.entries.map(entry => entry.capability))
                  const preserved = active.capabilities.filter(
                    capability => !managed.has(capability) && capability !== catalog.accessCapability
                  )
                  void persist(active.key, { capabilities: [...new Set([...preserved, ...next])] })
                }}
              />
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Badge({ tone, children }: { tone: 'rose' | 'slate' | 'primary'; children: React.ReactNode }) {
  const tones = {
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    primary: 'bg-primary/10 text-primary',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}
