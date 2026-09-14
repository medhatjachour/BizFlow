/**
 * KeyboardShortcutsHelp
 *
 * Rewritten from the app's original list, which advertised Ctrl+N / Ctrl+E /
 * Ctrl+R / Ctrl+F / Ctrl+S. Nothing in the codebase listens for those, so the
 * panel was mostly teaching people keys that did nothing. Every entry below was
 * checked against the handler that implements it.
 *
 * Two sources of truth:
 *   - App.tsx registers Ctrl+K globally.
 *   - All nine modules register Alt+1..9 (jump to tab) and F1 (their own guide)
 *     on window, so those work anywhere inside a module.
 *
 * The trigger button deliberately has no positioning of its own - HelpCentre
 * owns the launcher column so the two buttons cannot drift apart or land under
 * the trial badge.
 */

import { useEffect, useMemo, useState } from 'react'
import { Keyboard, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { MODULE_REGISTRY, type ModuleId } from '../../../shared/modules'

interface Shortcut {
  keys: string[]
  description: string
  scope: string
}

const SHORTCUTS: Shortcut[] = [
  // — Everywhere ————————————————————————————————————————————————
  { keys: ['Ctrl', 'K'], description: 'Open the command palette — jump to any screen or action', scope: 'Everywhere' },
  { keys: ['Esc'], description: 'Close the open dialog or cancel what you are doing', scope: 'Everywhere' },
  { keys: ['Tab'], description: 'Move to the next field in a form', scope: 'Everywhere' },
  { keys: ['Shift', 'Tab'], description: 'Move to the previous field', scope: 'Everywhere' },
  { keys: ['Enter'], description: 'Confirm, save, or commit the value you are editing', scope: 'Everywhere' },

  // — Command palette ————————————————————————————————————————————
  { keys: ['↑', '↓'], description: 'Move through the results', scope: 'Command palette' },
  { keys: ['Tab'], description: 'Also moves through the results', scope: 'Command palette' },
  { keys: ['Home'], description: 'Jump to the first result', scope: 'Command palette' },
  { keys: ['End'], description: 'Jump to the last result', scope: 'Command palette' },
  { keys: ['Enter'], description: 'Run the highlighted command', scope: 'Command palette' },
  { keys: ['Esc'], description: 'Close the palette', scope: 'Command palette' },

  // — Inside any module ——————————————————————————————————————————
  { keys: ['Alt', '1…9'], description: 'Jump straight to the 1st…9th tab of the module you are in', scope: 'Any module' },
  { keys: ['F1'], description: "Toggle that module's own guide", scope: 'Any module' },
  { keys: ['Ctrl', 'K'], description: 'Jump to a different module', scope: 'Any module' },

  // — Commerce → Turbo QuickSale ——————————————————————————————————
  { keys: ['/'], description: 'Put the cursor in the search box', scope: 'Commerce · Turbo QuickSale' },
  { keys: ['Esc'], description: 'Clear the search, or close the results dropdown', scope: 'Commerce · Turbo QuickSale' },

  // — Point of sale ——————————————————————————————————————————————
  { keys: ['Enter'], description: 'Commit the quantity or price you typed into a cart line', scope: 'Point of sale' },
]

const MODULE_ROUTES: Record<string, ModuleId> = {
  commerce: 'commerce',
  bakery: 'bakery',
  restaurant: 'restaurant',
  warehouse: 'warehouse',
  clinic: 'clinic',
  vet: 'vet',
  gym: 'gym',
  pharmacy: 'pharmacy',
  coffee: 'coffee',
}

const SCOPE_ORDER = [
  'Everywhere',
  'Command palette',
  'Any module',
  'Commerce · Turbo QuickSale',
  'Point of sale',
]

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()

  // Opened by the command palette, which cannot reach into this component.
  useEffect(() => {
    const open = () => setIsOpen(true)
    window.addEventListener('bizflow:shortcuts:open', open)
    return () => window.removeEventListener('bizflow:shortcuts:open', open)
  }, [])

  useEffect(() => {
    if (isOpen) setQuery('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  /** Name of the module the user is currently inside, if any. */
  const currentModule = useMemo(() => {
    const segment = location.pathname.split('/')[1] ?? ''
    const id = MODULE_ROUTES[segment]
    return id ? MODULE_REGISTRY[id] : null
  }, [location.pathname])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SHORTCUTS
    return SHORTCUTS.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.scope.toLowerCase().includes(q) ||
        s.keys.join(' ').toLowerCase().includes(q)
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, Shortcut[]>()
    for (const shortcut of filtered) {
      const list = map.get(shortcut.scope) ?? []
      list.push(shortcut)
      map.set(shortcut.scope, list)
    }
    const scopes = [...map.keys()].sort((a, b) => {
      const ia = SCOPE_ORDER.indexOf(a)
      const ib = SCOPE_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    return scopes.map((scope) => ({ scope, items: map.get(scope)! }))
  }, [filtered])

  return (
    <>
      {/* Trigger — positioned by the HelpCentre launcher column */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-slate-200 bg-white p-3 shadow-lg transition-all hover:scale-110 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <Keyboard className="h-5 w-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[160] flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm sm:pt-[8vh]"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
              <div className="min-w-0">
                <h2 id="shortcuts-title" className="text-base font-semibold text-slate-900 dark:text-white">
                  Keyboard shortcuts
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {currentModule
                    ? `You are in ${currentModule.name}. Alt + 1…9 jumps between its tabs, F1 opens its guide.`
                    : 'Everything the app actually listens for. Ctrl + K is the one worth learning.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
              <label className="relative block">
                <span className="sr-only">Filter shortcuts</span>
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter shortcuts…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {grouped.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nothing matches “{query}”.
                </p>
              ) : (
                grouped.map(({ scope, items }) => (
                  <section key={scope} className="mb-2">
                    <h3 className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {scope}
                    </h3>
                    <dl className="space-y-0.5">
                      {items.map((shortcut, i) => (
                        <div
                          key={`${scope}-${i}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <dt className="flex shrink-0 items-center gap-1">
                            {shortcut.keys.map((key) => (
                              <kbd
                                key={key}
                                className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              >
                                {key}
                              </kbd>
                            ))}
                          </dt>
                          <dd className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-400">
                            {shortcut.description}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))
              )}
            </div>

            <p className="border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Modules show their own shortcuts too — press F1 while inside one.
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
