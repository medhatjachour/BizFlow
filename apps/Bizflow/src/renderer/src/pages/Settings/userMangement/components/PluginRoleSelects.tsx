import { useEffect, useState } from 'react'
import { CAPABILITIES, type Capability, type PluginId, type PluginRoleAssignments } from '../../../../../../shared/permissions'
import { BUNDLED_PLUGIN_FLAGS, PLUGIN_ROLE_OPTIONS, ROLE_PRESENTATION } from '../constants'

type Props = {
  value: PluginRoleAssignments
  onChange: (value: PluginRoleAssignments) => void
  pluginScope: PluginId | null
}

type RoleChoice = { key: string; label: string; capabilities: Capability[] }

export default function PluginRoleSelects({ value, onChange, pluginScope }: Props) {
  const available = PLUGIN_ROLE_OPTIONS.filter(plugin =>
    BUNDLED_PLUGIN_FLAGS[plugin.id] && (!pluginScope || plugin.id === pluginScope)
  )

  // Roles are stored in the DB, so custom ones must come from there rather
  // than the built-in fallback list.
  const [liveRoles, setLiveRoles] = useState<Record<string, RoleChoice[]>>({})

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      available.map(async plugin => [plugin.id, await window.api.roles.list(plugin.id).catch(() => [])] as const)
    ).then(entries => {
      if (cancelled) return
      setLiveRoles(Object.fromEntries(
        entries.map(([id, roles]) => [
          id,
          roles.map(role => ({ key: role.key, label: role.label, capabilities: role.capabilities })),
        ])
      ))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginScope])

  if (available.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {pluginScope ? `${available[0]?.label} role` : 'Plugin access'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {pluginScope ? 'Choose a role and review exactly what it allows before saving.' : 'Assign a separate role for each enabled plugin.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {available.map(plugin => {
          const roles: RoleChoice[] = liveRoles[plugin.id]
            ?? plugin.roles.map(role => ({ ...role, capabilities: [] as Capability[] }))
          const selectedRole = value[plugin.id]
          const selected = roles.find(role => role.key === selectedRole)
          const roleMeta = selectedRole ? ROLE_PRESENTATION[selectedRole] : undefined

          return (
            <div key={plugin.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-3">
              {!pluginScope && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{plugin.label}</p>}

              <select
                value={selectedRole ?? ''}
                onChange={(event) => {
                  const next = { ...value }
                  if (event.target.value) next[plugin.id] = event.target.value
                  else delete next[plugin.id]
                  onChange(next)
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">No plugin access</option>
                {roles.map(role => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </select>

              {selected && (
                <div className={`rounded-lg border px-3 py-2.5 ${roleMeta?.tone ?? 'border-primary/20 bg-primary/5 text-slate-700 dark:text-slate-200'}`}>
                  <p className="text-xs font-semibold">{selected.label} can:</p>
                  {selected.capabilities.length === 0 ? (
                    <p className="mt-1.5 text-xs opacity-80">No permissions granted yet.</p>
                  ) : (
                    <ul className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 max-h-36 overflow-y-auto pr-1">
                      {selected.capabilities.map(capability => (
                        <li key={capability} className="text-xs opacity-90 break-words">
                          {CAPABILITIES[capability]?.label ?? capability}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
