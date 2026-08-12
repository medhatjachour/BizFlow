import { Check, Eye, Pencil, ShieldCheck } from 'lucide-react'
import type { Capability, PluginPermissionCatalog } from '../../../../shared/permissions'

type Props = {
  catalog: PluginPermissionCatalog
  capabilities: Capability[]
  disabled?: boolean
  onChange: (capabilities: Capability[]) => void
}

const PRESETS: Array<{ id: 'viewer' | 'editor' | 'admin'; label: string; Icon: typeof Eye }> = [
  { id: 'viewer', label: 'Viewer', Icon: Eye },
  { id: 'editor', label: 'Editor', Icon: Pencil },
  { id: 'admin', label: 'Admin', Icon: ShieldCheck },
]

export default function PermissionMatrix({ catalog, capabilities, disabled = false, onChange }: Props) {
  const pages = catalog.entries.filter(entry => entry.kind === 'page')
  const actions = catalog.entries.filter(entry => entry.kind === 'action')
  const selected = new Set(capabilities)

  function update(capability: Capability, enabled: boolean) {
    const next = new Set(capabilities)
    if (enabled) next.add(capability)
    else next.delete(capability)
    onChange([...next])
  }

  function updatePage(pageId: string, capability: Capability, enabled: boolean) {
    const next = new Set(capabilities)
    if (enabled) next.add(capability)
    else {
      next.delete(capability)
      actions.filter(action => action.parentId === pageId).forEach(action => next.delete(action.capability))
    }
    onChange([...next])
  }

  function applyPreset(preset: 'viewer' | 'editor' | 'admin') {
    const pageCapabilities = pages.map(page => page.capability)
    const actionCapabilities = actions.map(action => action.capability)
    const catalogCapabilities = catalog.entries.map(entry => entry.capability)
    const preserved = capabilities.filter(capability => !catalogCapabilities.includes(capability))
    const next = preset === 'viewer'
      ? pageCapabilities.filter(capability => capability === 'coffee_sales' || capability === 'coffee_reports')
      : preset === 'editor'
        ? pageCapabilities
        : [...pageCapabilities, ...actionCapabilities]
    onChange([...new Set([...preserved, ...next])])
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{catalog.label} access</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pages control visibility. Actions are available only when their parent page is enabled.</p>
        </div>
        <div className="flex items-center gap-1">
          {PRESETS.map(({ id, label, Icon }) => (
            <button key={id} type="button" disabled={disabled} onClick={() => applyPreset(id)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {pages.map(page => {
          const enabled = selected.has(page.capability)
          const pageActions = actions.filter(action => action.parentId === page.id)
          return (
            <div key={page.id} className="px-4 py-3">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{page.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Page</span>
                </span>
                <input type="checkbox" checked={enabled} disabled={disabled} onChange={event => updatePage(page.id, page.capability, event.target.checked)} className="sr-only" />
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${enabled ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'}`}>
                  {enabled && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </label>
              {pageActions.length > 0 && (
                <div className={`mt-2 grid grid-cols-1 gap-1 border-l-2 pl-3 sm:grid-cols-3 ${enabled ? 'border-primary/40' : 'border-slate-200 opacity-45 dark:border-slate-700'}`}>
                  {pageActions.map(action => (
                    <label key={action.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" checked={selected.has(action.capability)} disabled={disabled || !enabled} onChange={event => update(action.capability, event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-primary" />
                      {action.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}