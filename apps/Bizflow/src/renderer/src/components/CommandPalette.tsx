/**
 * CommandPalette — ⌘K / Ctrl+K
 *
 * The old palette knew ten hard-coded routes and did substring matching. This
 * one is built on the shared command registry, so it covers the core app, every
 * settings tab, and every page of every *enabled* module, and it ranks results
 * rather than filtering them.
 *
 * Empty query  → recents, then everything, grouped.
 * Typing       → one ranked list across all groups, with the group shown per row.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Database,
  FileBarChart,
  Languages,
  LayoutDashboard,
  Archive,
  HelpCircle,
  Keyboard,
  Mail,
  Moon,
  Puzzle,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Sliders,
  Tag,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useModuleEnabled } from '../hooks/useModuleEnabled'
import { MODULE_IDS, MODULE_REGISTRY, type ModuleId } from '../../../shared/modules'
import {
  buildCommands,
  readRecentCommandIds,
  rememberCommand,
  searchCommands,
  type Command,
  type CommandGroup,
} from '../lib/commandRegistry'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const GROUP_LABEL: Record<CommandGroup, string> = {
  core: 'Go to',
  settings: 'Settings',
  module: 'Modules',
  action: 'Actions',
}

const GROUP_ORDER: CommandGroup[] = ['core', 'module', 'settings', 'action']

/** Icon per core route, so the list reads at a glance. */
function iconFor(command: Command): React.ElementType {
  if (command.group === 'action') {
    if (command.id.endsWith('help')) return HelpCircle
    if (command.id.endsWith('shortcuts')) return Keyboard
    if (command.id.endsWith('theme')) return Moon
    if (command.id.endsWith('language')) return Languages
  }
  if (command.group === 'settings') {
    const tab = command.id.split(':')[1]
    switch (tab) {
      case 'general': return Settings
      case 'display': return Sliders
      case 'categories': return Tag
      case 'users': return UserCog
      case 'tax': return Receipt
      case 'notifications': return Bell
      case 'email': return Mail
      case 'backup': return Database
      case 'archive': return Archive
      case 'modules': return Puzzle
      default: return Settings
    }
  }
  switch (command.id) {
    case 'core:/dashboard': return LayoutDashboard
    case 'core:/employees': return Users
    case 'core:/reports': return FileBarChart
    case 'core:/finance': return Wallet
    case 'core:/settings': return Settings
    default: return ShoppingCart
  }
}

/** Bold the parts of the label the query actually matched. */
function highlight(label: string, query: string): React.ReactNode {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1)
  if (tokens.length === 0) return label

  const lower = label.toLowerCase()
  const marks = new Array(label.length).fill(false)

  for (const token of tokens) {
    let from = 0
    for (;;) {
      const at = lower.indexOf(token, from)
      if (at === -1) break
      for (let i = at; i < at + token.length; i++) marks[i] = true
      from = at + token.length
    }
  }

  if (!marks.some(Boolean)) return label

  const parts: React.ReactNode[] = []
  let run = ''
  let runMarked = marks[0]
  for (let i = 0; i < label.length; i++) {
    if (marks[i] !== runMarked) {
      parts.push(runMarked ? <mark key={i} className="bg-transparent font-semibold text-primary">{run}</mark> : run)
      run = ''
      runMarked = marks[i]
    }
    run += label[i]
  }
  parts.push(runMarked ? <mark key="last" className="bg-transparent font-semibold text-primary">{run}</mark> : run)
  return <>{parts}</>
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { can } = useAuth()
  const { setLanguage } = useLanguage()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // One hook call per module - hooks cannot be called in a loop.
  const commerce = useModuleEnabled(MODULE_IDS.COMMERCE)
  const bakery = useModuleEnabled(MODULE_IDS.BAKERY)
  const restaurant = useModuleEnabled(MODULE_IDS.RESTAURANT)
  const warehouse = useModuleEnabled(MODULE_IDS.WAREHOUSE)
  const clinic = useModuleEnabled(MODULE_IDS.CLINIC)
  const vet = useModuleEnabled(MODULE_IDS.VET)
  const gym = useModuleEnabled(MODULE_IDS.GYM)
  const pharmacy = useModuleEnabled(MODULE_IDS.PHARMACY)
  const coffee = useModuleEnabled(MODULE_IDS.COFFEE)

  const enabledModules = useMemo(() => {
    const out: ModuleId[] = []
    if (__PLUGIN_COMMERCE__ && commerce) out.push(MODULE_IDS.COMMERCE)
    if (__PLUGIN_BAKERY__ && bakery) out.push(MODULE_IDS.BAKERY)
    if (__PLUGIN_RESTAURANT__ && restaurant) out.push(MODULE_IDS.RESTAURANT)
    if (__PLUGIN_WAREHOUSE__ && warehouse) out.push(MODULE_IDS.WAREHOUSE)
    if (__PLUGIN_CLINIC__ && clinic) out.push(MODULE_IDS.CLINIC)
    if (__PLUGIN_VET__ && vet) out.push(MODULE_IDS.VET)
    if (__PLUGIN_GYM__ && gym) out.push(MODULE_IDS.GYM)
    if (__PLUGIN_PHARMACY__ && pharmacy) out.push(MODULE_IDS.PHARMACY)
    if (__PLUGIN_COFFEE__ && coffee) out.push(MODULE_IDS.COFFEE)
    return out
  }, [commerce, bakery, restaurant, warehouse, clinic, vet, gym, pharmacy, coffee])

  /**
   * Commands the user is allowed to run. Settings entries are gated here rather
   * than hiding the whole palette, so a cashier still gets their module screens.
   */
  const commands = useMemo(() => {
    const all = buildCommands(enabledModules)
    return all.filter((command) => {
      if (command.group !== 'settings') return true
      return can('manage_settings')
    })
  }, [enabledModules, can])

  const byId = useMemo(() => new Map(commands.map((c) => [c.id, c])), [commands])

  const search = useMemo(() => searchCommands(commands, query), [commands, query])

  /** Recents only make sense with an empty query. */
  const recent = useMemo(() => {
    if (query.trim()) return []
    return readRecentCommandIds()
      .map((id) => byId.get(id))
      .filter((c): c is Command => Boolean(c))
  }, [query, byId])

  /**
   * Flatten to what is rendered, so keyboard movement and rendering cannot drift
   * apart. Headers are display-only; only rows are selectable.
   */
  const rows = useMemo(() => {
    if (query.trim()) {
      return search.map(({ command }) => ({ kind: 'row' as const, command, header: GROUP_LABEL[command.group] }))
    }

    const out: { kind: 'header' | 'row'; command?: Command; header?: string; label?: string }[] = []

    if (recent.length) {
      out.push({ kind: 'header', label: 'Recent' })
      for (const command of recent) out.push({ kind: 'row', command, header: 'Recent' })
    }

    for (const group of GROUP_ORDER) {
      const inGroup = search.filter(({ command }) => command.group === group).map(({ command }) => command)
      if (!inGroup.length) continue
      out.push({ kind: 'header', label: GROUP_LABEL[group] })
      for (const command of inGroup) out.push({ kind: 'row', command, header: GROUP_LABEL[group] })
    }

    return out
  }, [query, search, recent])

  const selectable = useMemo(
    () => rows.filter((r): r is { kind: 'row'; command: Command; header: string } => r.kind === 'row'),
    [rows]
  )

  // Reset when opened so a previous search never leaks into a new one.
  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setActiveIndex(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  // Keep the highlight inside the list as results change.
  useEffect(() => {
    setActiveIndex((current) => (current >= selectable.length ? 0 : current))
  }, [selectable.length])

  const runCommand = useCallback(
    (command: Command) => {
      rememberCommand(command.id)
      command.run({
        navigate,
        close: onClose,
        pathname: location.pathname,
        setLanguage: (lang) => setLanguage(lang as never),
      })
    },
    [navigate, onClose, location.pathname, setLanguage]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault()
        setActiveIndex((i) => (selectable.length ? (i + 1) % selectable.length : 0))
        return
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault()
        setActiveIndex((i) => (selectable.length ? (i - 1 + selectable.length) % selectable.length : 0))
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        setActiveIndex(0)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        setActiveIndex(Math.max(0, selectable.length - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const target = selectable[activeIndex]
        if (target) runCommand(target.command)
      }
    },
    [selectable, activeIndex, runCommand, onClose]
  )

  // Scroll the highlighted row into view without moving the whole page.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!isOpen) return null

  let rowCursor = -1

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm sm:pt-[8vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search modules, screens and actions…"
            aria-label="Search commands"
            aria-controls="command-palette-results"
            aria-activedescendant={selectable[activeIndex] ? `cmd-${selectable[activeIndex].command.id}` : undefined}
            className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block dark:border-slate-600 dark:text-slate-400">
              Esc
            </kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} id="command-palette-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {selectable.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Nothing matches “{query}”
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try a module name like “gym”, a screen like “inventory”, or a task like “backup”.
              </p>
            </div>
          ) : (
            rows.map((row, i) => {
              if (row.kind === 'header') {
                return (
                  <p
                    key={`h-${row.label}-${i}`}
                    className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                  >
                    {row.label}
                  </p>
                )
              }

              rowCursor += 1
              const index = rowCursor
              const command = row.command!
              const Icon = iconFor(command)
              const moduleMeta = command.moduleId ? MODULE_REGISTRY[command.moduleId] : undefined
              const isActive = index === activeIndex

              return (
                <button
                  key={command.id}
                  id={`cmd-${command.id}`}
                  data-row-index={index}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${
                    isActive ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${
                      isActive ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                    aria-hidden="true"
                  >
                    {moduleMeta ? moduleMeta.icon : <Icon className="h-4 w-4" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {highlight(command.label, query)}
                    </span>
                    {command.description ? (
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {command.description}
                      </span>
                    ) : null}
                  </span>

                  {/* Group badge keeps the ranked list readable */}
                  {query.trim() ? (
                    <span className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block dark:bg-slate-800 dark:text-slate-400">
                      {row.header}
                    </span>
                  ) : null}

                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition rtl:rotate-180 dark:text-slate-600 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-semibold dark:border-slate-600">↑↓</kbd>
            navigate
            <kbd className="ms-2 rounded border border-slate-300 px-1.5 py-0.5 font-semibold dark:border-slate-600">↵</kbd>
            open
          </span>
          <span>
            {enabledModules.length} module{enabledModules.length === 1 ? '' : 's'} · {selectable.length} result
            {selectable.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  )
}
