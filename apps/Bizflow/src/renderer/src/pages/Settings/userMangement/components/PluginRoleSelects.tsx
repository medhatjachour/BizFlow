import { CAPABILITIES, PLUGIN_ROLE_DEFAULTS, type PluginId, type PluginRoleAssignments } from '../../../../../../shared/permissions'
import { BUNDLED_PLUGIN_FLAGS, PLUGIN_ROLE_OPTIONS, ROLE_PRESENTATION } from '../constants'

type Props = {
  value: PluginRoleAssignments
  onChange: (value: PluginRoleAssignments) => void
  pluginScope: PluginId | null
}

export default function PluginRoleSelects({ value, onChange, pluginScope }: Props) {
  const available = PLUGIN_ROLE_OPTIONS.filter(plugin =>
    BUNDLED_PLUGIN_FLAGS[plugin.id] && (!pluginScope || plugin.id === pluginScope)
  )

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
          const selectedRole = value[plugin.id]
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
                {plugin.roles.map(role => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </select>

              {selectedRole && (
                <div className={`rounded-lg border px-3 py-2.5 ${roleMeta?.tone ?? 'border-primary/20 bg-primary/5 text-slate-700 dark:text-slate-200'}`}>
                  <p className="text-xs font-semibold">
                    {plugin.roles.find(role => role.key === selectedRole)?.label} can:
                  </p>
                  <ul className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 max-h-36 overflow-y-auto pr-1">
                    {(PLUGIN_ROLE_DEFAULTS[plugin.id][selectedRole] ?? []).map(capability => (
                      <li key={capability} className="text-xs opacity-90 break-words">{CAPABILITIES[capability].label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
