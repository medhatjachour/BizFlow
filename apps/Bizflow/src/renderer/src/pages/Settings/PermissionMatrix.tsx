import { useMemo, useState } from 'react'
import { Check, Eye, Pencil, ShieldCheck, Search, Ban } from 'lucide-react'
import {
  presetCapabilities,
  type Capability,
  type PermissionPreset,
  type PluginPermissionCatalog,
  type Scope,
} from '../../../../shared/permissions'

type Props = {
  catalog: PluginPermissionCatalog
  scope: Scope
  capabilities: Capability[]
  disabled?: boolean
  onChange: (capabilities: Capability[]) => void
}

const PRESETS: Array<{ id: PermissionPreset; label: string; Icon: typeof Eye; hint: string }> = [
  { id: 'none',   label: 'None',   Icon: Ban,         hint: 'Revoke everything in this section' },
  { id: 'viewer', label: 'Viewer', Icon: Eye,         hint: 'Read-only pages only' },
  { id: 'editor', label: 'Editor', Icon: Pencil,      hint: 'All pages, no sensitive actions' },
  { id: 'admin',  label: 'Admin',  Icon: ShieldCheck, hint: 'All pages and sensitive actions' },
]

export default function PermissionMatrix({ catalog, scope, capabilities, disabled = false, onChange }: Props) {
  const [query, setQuery] = useState('')
  const selected = useMemo(() => new Set(capabilities), [capabilities])

  const pages = useMemo(() => {
    const actions = catalog.entries.filter(entry => entry.kind === 'action')
    return catalog.entries
      .filter(entry => entry.kind === 'page')
      .map(page => ({ ...page, actions: actions.filter(action => action.parentId === page.id) }))
  }, [catalog])

  const visiblePages = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pages
    return pages.filter(page =>
      page.label.toLowerCase().includes(needle) ||
      page.actions.some(action => action.label.toLowerCase().includes(needle))
    )
  }, [pages, query])

  const grantedPages = pages.filter(page => selected.has(page.capability)).length

  function apply(next: Iterable<Capability>) {
    onChange([...new Set(next)])
  }

  function toggleAction(capability: Capability, enabled: boolean) {
    const next = new Set(selected)
    if (enabled) next.add(capability)
    else next.delete(capability)
    apply(next)
  }

  /** Turning a page off also revokes its actions — they cannot apply without it. */
  function togglePage(page: (typeof pages)[number], enabled: boolean) {
    const next = new Set(selected)
    if (enabled) {
      next.add(page.capability)
    } else {
      next.delete(page.capability)
      page.actions.forEach(action => next.delete(action.capability))
    }
    apply(next)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{catalog.label} permissions</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {grantedPages} of {pages.length} pages enabled · sensitive actions require their page
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter permissions…"
              className="h-8 w-44 rounded-lg border border-slate-200 bg-white ps-8 pe-2 text-xs text-slate-700 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm dark:bg-slate-800">
            {PRESETS.map(({ id, label, Icon, hint }) => (
              <button
                key={id}
                type="button"
                title={hint}
                disabled={disabled}
                onClick={() => apply(presetCapabilities(scope, id))}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-primary/10 hover:text-primary disabled:opacity-40 dark:text-slate-300"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
        {visiblePages.map(page => {
          const enabled = selected.has(page.capability)
          return (
            <div key={page.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{page.label}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {page.viewer ? 'Read-only page' : 'Page access'}
                    {page.actions.length > 0 && ` · ${page.actions.length} sensitive action${page.actions.length === 1 ? '' : 's'}`}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Allow ${page.label}`}
                  disabled={disabled}
                  onClick={() => togglePage(page, !enabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                      enabled ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {page.actions.length > 0 && (
                <div
                  className={`mt-2.5 grid grid-cols-1 gap-1.5 border-s-2 ps-3 sm:grid-cols-2 ${
                    enabled ? 'border-primary/40' : 'border-slate-200 opacity-45 dark:border-slate-700'
                  }`}
                >
                  {page.actions.map(action => (
                    <label
                      key={action.id}
                      className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={selected.has(action.capability)}
                        disabled={disabled || !enabled}
                        onChange={event => toggleAction(action.capability, event.target.checked)}
                      />
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                          selected.has(action.capability)
                            ? 'bg-primary text-white'
                            : 'bg-slate-200 text-transparent dark:bg-slate-700'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </span>
                      {action.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {visiblePages.length === 0 && (
          <p className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No permissions match “{query}”.
          </p>
        )}
      </div>
    </div>
  )
}