/**
 * Personal Work – Main Page
 * Tab-based navigation container for the whole personal-work operating system.
 * Tabs: Overview | Clients | Projects | Requests | Waiting | Tasks | Focus |
 *       Work Log | Invoices | Finance | Capacity | Playbook | Notes
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Briefcase,
  Users,
  UserPlus,
  FolderKanban,
  FolderPlus,
  GitPullRequest,
  Hourglass,
  ListChecks,
  Timer,
  FileText,
  Receipt,
  Wallet,
  MessageSquare,
  StickyNote,
  HelpCircle,
  Maximize2,
  Minimize2,
  X,
  Keyboard,
  Command,
  ChevronRight,
  Target,
  Gauge,
  ShieldAlert,
  Lock,
  Percent,
  Moon
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Capability } from '../../../../../shared/permissions'
import { usePersonalCounts } from './hooks/useAsync'
import { requestIntent } from './hooks/useIntent'
import { quietReasonKey } from './hooks/useQuietMode'
import { refreshQuietRuntime, setQuietReporter, useQuietState } from './hooks/useQuietRuntime'

// Sub-views
import OverviewTab from './overview/OverviewTab'
import ClientsTab from './clients/ClientsTab'
import ProjectsTab from './projects/ProjectsTab'
import RequestsTab from './requests/RequestsTab'
import WaitsTab from './waits/WaitsTab'
import TasksTab from './tasks/TasksTab'
import FocusTab from './focus/FocusTab'
import WorklogTab from './worklog/WorklogTab'
import InvoicesTab from './invoices/InvoicesTab'
import FinanceTab from './finance/FinanceTab'
import CapacityTab from './capacity/CapacityTab'
import PlaybookTab from './playbook/PlaybookTab'
import NotesTab from './notes/NotesTab'
import PersonalCommandPalette, { type PaletteEntry } from './components/PersonalCommandPalette'

export type PersonalTab =
  | 'overview'
  | 'clients'
  | 'projects'
  | 'requests'
  | 'waits'
  | 'tasks'
  | 'focus'
  | 'worklog'
  | 'invoices'
  | 'finance'
  | 'capacity'
  | 'playbook'
  | 'notes'

interface TabConfig {
  id: PersonalTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  capability: Capability
}

/** Backstop poll for quiet mode - in-app start/stop refreshes immediately. */
const QUIET_POLL_MS = 15_000

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    labelKey: 'pwTabOverview',
    defaultLabel: 'Today',
    icon: <Target className="w-4 h-4" />,
    capability: 'personal_overview'
  },
  {
    id: 'clients',
    labelKey: 'pwTabClients',
    defaultLabel: 'Clients',
    icon: <Users className="w-4 h-4" />,
    capability: 'personal_clients'
  },
  {
    id: 'projects',
    labelKey: 'pwTabProjects',
    defaultLabel: 'Projects',
    icon: <FolderKanban className="w-4 h-4" />,
    capability: 'personal_projects'
  },
  {
    id: 'requests',
    labelKey: 'pwTabRequests',
    defaultLabel: 'Change Requests',
    icon: <GitPullRequest className="w-4 h-4" />,
    capability: 'personal_requests'
  },
  {
    id: 'waits',
    labelKey: 'pwTabWaits',
    defaultLabel: 'Waiting On Client',
    icon: <Hourglass className="w-4 h-4" />,
    capability: 'personal_waits'
  },
  {
    id: 'tasks',
    labelKey: 'pwTabTasks',
    defaultLabel: 'Daily 3 & Tasks',
    icon: <ListChecks className="w-4 h-4" />,
    capability: 'personal_tasks'
  },
  {
    id: 'focus',
    labelKey: 'pwTabFocus',
    defaultLabel: 'Focus Timer',
    icon: <Timer className="w-4 h-4" />,
    capability: 'personal_focus'
  },
  {
    id: 'worklog',
    labelKey: 'pwTabWorklog',
    defaultLabel: 'Work Log',
    icon: <FileText className="w-4 h-4" />,
    capability: 'personal_worklog'
  },
  {
    id: 'capacity',
    labelKey: 'pwTabCapacity',
    defaultLabel: 'Capacity',
    icon: <Gauge className="w-4 h-4" />,
    capability: 'personal_capacity'
  },
  {
    id: 'invoices',
    labelKey: 'pwTabInvoices',
    defaultLabel: 'Invoices',
    icon: <Receipt className="w-4 h-4" />,
    capability: 'personal_invoices'
  },
  {
    id: 'finance',
    labelKey: 'pwTabFinance',
    defaultLabel: 'Finance & Rate',
    icon: <Wallet className="w-4 h-4" />,
    capability: 'personal_finance'
  },
  {
    id: 'playbook',
    labelKey: 'pwTabPlaybook',
    defaultLabel: 'Playbook',
    icon: <MessageSquare className="w-4 h-4" />,
    capability: 'personal_playbook'
  },
  {
    id: 'notes',
    labelKey: 'pwTabNotes',
    defaultLabel: 'Notes',
    icon: <StickyNote className="w-4 h-4" />,
    capability: 'personal_notes'
  }
]

/**
 * The 13 tabs are grouped by the phase of solo work they belong to. Tab order
 * inside the strip follows these groups, so `Alt + 1..9` and the palette
 * numbering always match what the user sees from left to right.
 */
const TAB_GROUPS: { id: string; labelKey: string; tabs: PersonalTab[] }[] = [
  {
    id: 'deliver',
    labelKey: 'pwGroupDeliver',
    tabs: ['overview', 'clients', 'projects', 'requests', 'waits']
  },
  { id: 'time', labelKey: 'pwGroupTime', tabs: ['tasks', 'focus', 'worklog', 'capacity'] },
  { id: 'money', labelKey: 'pwGroupMoney', tabs: ['invoices', 'finance'] },
  { id: 'reference', labelKey: 'pwGroupReference', tabs: ['playbook', 'notes'] }
]

const LAST_TAB_KEY = 'bizflow:personal:tab'
const FULLSCREEN_KEY = 'bizflow:personal:fullscreen_mode'

/**
 * Shared chrome for the header's secondary actions so borders, heights and
 * hover states line up instead of drifting per button.
 */
const HEADER_ACTION =
  'inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] active:scale-95 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
const HEADER_ICON_ACTION =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] active:scale-95 dark:border-slate-700/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
const HEADER_KBD =
  'rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[10px] text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400'

/**
 * Create-form shortcuts offered by the command palette. Each one navigates to
 * its tab and then asks that tab to open its create form.
 */
const CREATE_ACTIONS: {
  id: string
  tab: PersonalTab
  capability: Capability
  labelKey: string
  fallback: string
  icon: ReactNode
}[] = [
  {
    id: 'client',
    tab: 'clients',
    capability: 'personal_clients',
    labelKey: 'pwCmdNewClient',
    fallback: 'New client',
    icon: <UserPlus className="w-3.5 h-3.5" />
  },
  {
    id: 'project',
    tab: 'projects',
    capability: 'personal_projects',
    labelKey: 'pwCmdNewProject',
    fallback: 'New project',
    icon: <FolderPlus className="w-3.5 h-3.5" />
  },
  {
    id: 'request',
    tab: 'requests',
    capability: 'personal_requests',
    labelKey: 'pwCmdNewRequest',
    fallback: 'New change request',
    icon: <GitPullRequest className="w-3.5 h-3.5" />
  },
  {
    id: 'wait',
    tab: 'waits',
    capability: 'personal_waits',
    labelKey: 'pwCmdNewWait',
    fallback: 'New waiting log',
    icon: <Hourglass className="w-3.5 h-3.5" />
  },
  {
    id: 'task',
    tab: 'tasks',
    capability: 'personal_tasks',
    labelKey: 'pwCmdNewTask',
    fallback: 'New task',
    icon: <ListChecks className="w-3.5 h-3.5" />
  },
  {
    id: 'script',
    tab: 'playbook',
    capability: 'personal_playbook',
    labelKey: 'pwCmdNewScript',
    fallback: 'New script',
    icon: <MessageSquare className="w-3.5 h-3.5" />
  },
  {
    id: 'note',
    tab: 'notes',
    capability: 'personal_notes',
    labelKey: 'pwCmdNewNote',
    fallback: 'New note',
    icon: <StickyNote className="w-3.5 h-3.5" />
  }
]

export default function PersonalPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  const hasPluginAccess = can('access_personal')
  const { badges, refresh: refreshBadges } = usePersonalCounts()
  const quiet = useQuietState()
  // Quiet-mode diagnostics deliberately bypass the quiet-mode toast gate: a hook
  // that failed to run must be reported while the session that triggered it is
  // still open, which is exactly when the gate is holding messages back.
  const quietReporter = useToast()

  // Filter visible tabs by user capabilities
  const visibleTabs = useMemo(() => {
    if (!hasPluginAccess) return []
    return TABS_CONFIG.filter((tab) => can(tab.capability))
  }, [hasPluginAccess, can])

  // Grouped tabs for the strip: permission-filtered first so a restricted user
  // never sees a group label with nothing under it.
  const tabGroups = useMemo(
    () =>
      TAB_GROUPS.map((group) => ({
        ...group,
        tabs: visibleTabs.filter((tab) => group.tabs.includes(tab.id))
      })).filter((group) => group.tabs.length > 0),
    [visibleTabs]
  )

  const [activeTab, setActiveTab] = useState<PersonalTab>(() => {
    const saved = sessionStorage.getItem(LAST_TAB_KEY) as PersonalTab | null
    return saved || 'overview'
  })

  const [showGuide, setShowGuide] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem(FULLSCREEN_KEY) === 'true'
  })

  // Fallback if the current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'overview'
      setActiveTab(fallback)
      sessionStorage.setItem(LAST_TAB_KEY, fallback)
    }
  }, [activeTab, visibleTabs])

  const handleTabChange = (tabId: PersonalTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem(LAST_TAB_KEY, tabId)
    refreshBadges()
  }

  // Keyboard shortcuts: Alt + 1..9 picks a tab, Alt + 0 the tenth, Ctrl/Cmd +
  // PageUp/PageDown walks the whole strip (so no tab is unreachable), F1 toggles
  // the guide, Esc closes what is open, Ctrl/Cmd + K opens the plugin palette
  // (claimed from the app-wide palette, see the capture-phase note below).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        // App.tsx binds Ctrl + K to the app-wide command palette. This listener
        // runs in the capture phase, so claiming the event here keeps the two
        // palettes from opening on top of each other while the plugin is open.
        e.stopPropagation()
        // The palette would sit on top of another dialog, so leave those alone.
        if (!showGuide) setShowPalette((prev) => !prev)
        return
      }

      if (e.key === 'Escape') {
        if (showGuide) {
          e.preventDefault()
          setShowGuide(false)
        } else if (showPalette) {
          e.preventDefault()
          setShowPalette(false)
        }
        return
      }

      if (e.key === 'F1') {
        e.preventDefault()
        setShowGuide((prev) => !prev)
        return
      }

      // Tab switching is inert while an overlay or a text field owns the
      // screen: a stray Alt + digit must never swap the tab under an open form.
      const ownsScreen =
        showGuide ||
        showPalette ||
        (e.target instanceof HTMLElement &&
          (e.target.isContentEditable || e.target.closest('input, textarea, select') !== null))

      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'PageDown' || e.key === 'PageUp')) {
        if (ownsScreen) return
        e.preventDefault()
        const step = e.key === 'PageDown' ? 1 : -1
        const from = visibleTabs.findIndex((tab) => tab.id === activeTab)
        const next = (from + step + visibleTabs.length) % visibleTabs.length
        handleTabChange(visibleTabs[next].id)
        return
      }

      if (!e.altKey || e.ctrlKey || e.metaKey || visibleTabs.length === 0 || ownsScreen) return

      // '0' lands on the tenth tab, the way a keypad reads.
      const slot = e.key === '0' ? 9 : parseInt(e.key, 10) - 1
      if (!Number.isNaN(slot) && slot >= 0 && slot < visibleTabs.length) {
        e.preventDefault()
        handleTabChange(visibleTabs[slot].id)
      }
    }

    // Capture phase: the app-wide palette (App.tsx) listens on window too and
    // must not also react to Ctrl + K. Every other key falls through untouched.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs, showGuide, showPalette, activeTab])

  // Open-tab requests from the command palette
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<PersonalTab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:personal:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:personal:open-tab', handleRequestedTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs])

  // Quiet mode (spec section 3): the runtime reports hook failures and the count
  // of messages it held back, and the shell is the only place that can surface
  // them, so it registers the reporter for as long as the page is open.
  useEffect(() => {
    setQuietReporter({
      onHookFailed: (reason, phase) =>
        quietReporter.warning(
          `${t(phase === 'enter' ? 'pwQuietEnterFailed' : 'pwQuietExitFailed')} · ${t(quietReasonKey(reason))}`
        ),
      onMutedSummary: (count) => quietReporter.info(t('pwQuietMutedSummary', { count }))
    })
    return () => setQuietReporter(null)
  }, [t, quietReporter])

  // A session can be started from the tray widget or a second window, so the
  // shell keeps a slow poll going as a backstop for the in-app calls, which
  // refresh straight after starting or stopping a timer.
  useEffect(() => {
    if (!hasPluginAccess) return
    void refreshQuietRuntime()
    const timer = window.setInterval(() => void refreshQuietRuntime(), QUIET_POLL_MS)
    return () => window.clearInterval(timer)
  }, [hasPluginAccess])

  const toggleFullscreen = () => {
    const next = !isFullscreenMode
    setIsFullscreenMode(next)
    localStorage.setItem(FULLSCREEN_KEY, String(next))
  }

  // Everything the palette can do, pre-localised so matching works in both
  // languages (and against the seeded English label as a fallback).
  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    const tabEntries: PaletteEntry[] = visibleTabs.map((tab, index) => ({
      id: `tab:${tab.id}`,
      labelKey: tab.labelKey,
      fallback: tab.defaultLabel,
      keywords: `tab ${tab.id}`,
      group: 'navigate',
      icon: tab.icon,
      // Mirrors the tab strip's accelerators: 1..9 then 0.
      shortcut: index < 9 ? `Alt ${index + 1}` : index === 9 ? 'Alt 0' : undefined,
      run: () => handleTabChange(tab.id)
    }))

    const createEntries: PaletteEntry[] = CREATE_ACTIONS.filter((action) =>
      can(action.capability)
    ).map((action) => ({
      id: `new:${action.id}`,
      labelKey: action.labelKey,
      fallback: action.fallback,
      keywords: `create add new ${action.id}`,
      group: 'create',
      icon: action.icon,
      run: () => {
        handleTabChange(action.tab)
        requestIntent(action.id)
      }
    }))

    const actionEntries: PaletteEntry[] = [
      {
        id: 'action:guide',
        labelKey: 'pwCmdOpenGuide',
        fallback: 'Open the guide',
        keywords: 'help f1 shortcuts',
        group: 'action',
        icon: <HelpCircle className="w-3.5 h-3.5" />,
        shortcut: 'F1',
        run: () => setShowGuide(true)
      },
      {
        id: 'action:focus',
        labelKey: 'pwCmdFocusView',
        fallback: 'Toggle focus view',
        keywords: 'fullscreen distraction',
        group: 'action',
        icon: isFullscreenMode ? (
          <Minimize2 className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        ),
        run: toggleFullscreen
      }
    ]

    return [...tabEntries, ...createEntries, ...actionEntries]
    // handleTabChange / toggleFullscreen are re-created on every render, so this
    // list is rebuilt every render too — that keeps the closures fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs, can, isFullscreenMode, handleTabChange, toggleFullscreen])

  if (!hasPluginAccess) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
        {t('pwNoAccess')}
      </div>
    )
  }

  return (
    <div data-plugin="personal" className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* ── Top Navigation & Header ────────────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          {!isFullscreenMode && (
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[color:var(--accent)] text-white flex items-center justify-center shadow-sm shadow-[color:var(--accent-tint)] ring-1 ring-[color:var(--accent-line)] shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('personalTitle')}
                  </h1>
                  <p className="hidden sm:block mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {t('personalTagline')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {quiet.enabled && quiet.active && (
                  <span
                    data-testid="quiet-badge"
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] px-2 text-[10px] font-semibold text-[color:var(--accent-text)]"
                    title={t('pwQuietBadgeHint')}
                  >
                    <Moon className="w-3 h-3" />
                    <span className="hidden md:inline">{t('pwQuietBadge')}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowPalette(true)}
                  className={`hidden sm:inline-flex ${HEADER_ACTION}`}
                  title={t('pwCmdButtonHint')}
                >
                  <Command className="w-3.5 h-3.5 text-[color:var(--accent-text)]" />
                  <span className="hidden md:inline">{t('pwCmdTitle')}</span>
                  <kbd className={HEADER_KBD}>Ctrl K</kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className={HEADER_ACTION}
                  title={t('pwGuideHint')}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[color:var(--accent-text)]" />
                  <span className="hidden sm:inline">{t('pwGuide')}</span>
                  <kbd className={`hidden md:inline ${HEADER_KBD}`}>F1</kbd>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={HEADER_ICON_ACTION}
                  title={isFullscreenMode ? t('pwExitFocusView') : t('pwEnterFocusView')}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Tab strip — grouped by phase of solo work, single scrollable row. */}
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <nav
              ref={tabListRef}
              role="tablist"
              aria-label={t('personalTitle')}
              className="flex items-center min-w-max"
            >
              {tabGroups.map((group, groupIdx) => (
                <div key={group.id} role="presentation" className="flex items-center">
                  {groupIdx > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-2 h-4 w-px bg-slate-200 dark:bg-slate-700"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="me-1.5 ms-0.5 hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:inline dark:text-slate-500"
                  >
                    {t(group.labelKey)}
                  </span>

                  {group.tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    const badge = badges[tab.id]
                    const shortcut = visibleTabs.findIndex((entry) => entry.id === tab.id) + 1
                    // Ten accelerators: 1..9 then 0, so the hint matches what the
                    // keyboard handler binds.
                    const accelerator =
                      shortcut <= 10 ? (shortcut === 10 ? '0' : `${shortcut}`) : null
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        id={`personal-tab-${tab.id}`}
                        data-personal-group={group.id}
                        aria-selected={isActive}
                        aria-controls={`personal-panel-${tab.id}`}
                        aria-keyshortcuts={accelerator ? `Alt+${accelerator}` : undefined}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => handleTabChange(tab.id)}
                        className={`group relative me-0.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] ${
                          isActive
                            ? 'bg-[color:var(--accent)] text-white shadow-sm shadow-[color:var(--accent-tint)]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <span
                          className={
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 transition-colors group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'
                          }
                        >
                          {tab.icon}
                        </span>

                        <span>{t(tab.labelKey)}</span>

                        {/* Shortcut hint: reserved space, revealed on hover/focus to keep the strip calm. */}
                        {accelerator && (
                          <span
                            className={`font-mono text-[10px] px-1 rounded border transition-opacity ${
                              isActive
                                ? 'border-white/20 bg-white/10 text-white'
                                : 'border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-slate-700 dark:text-slate-500'
                            }`}
                          >
                            {accelerator}
                          </span>
                        )}

                        {badge && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 rounded-full tabular-nums ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)] border border-[color:var(--accent-line)]'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>

            {isFullscreenMode && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`ms-auto ${HEADER_ICON_ACTION}`}
                title={t('pwExitFocusView')}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Tab Viewport ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Keyed so the entrance animation replays when the tab changes. */}
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'overview' && can('personal_overview') && (
            <OverviewTab onNavigate={handleTabChange} onCountsChanged={refreshBadges} />
          )}
          {activeTab === 'clients' && can('personal_clients') && <ClientsTab />}
          {activeTab === 'projects' && can('personal_projects') && <ProjectsTab />}
          {activeTab === 'requests' && can('personal_requests') && <RequestsTab />}
          {activeTab === 'waits' && can('personal_waits') && <WaitsTab />}
          {activeTab === 'tasks' && can('personal_tasks') && (
            <TasksTab onCountsChanged={refreshBadges} />
          )}
          {activeTab === 'focus' && can('personal_focus') && (
            <FocusTab onCountsChanged={refreshBadges} />
          )}
          {activeTab === 'worklog' && can('personal_worklog') && <WorklogTab />}
          {activeTab === 'invoices' && can('personal_invoices') && <InvoicesTab />}
          {activeTab === 'finance' && can('personal_finance') && <FinanceTab />}
          {activeTab === 'capacity' && can('personal_capacity') && <CapacityTab />}
          {activeTab === 'playbook' && can('personal_playbook') && <PlaybookTab />}
          {activeTab === 'notes' && can('personal_notes') && <NotesTab />}
        </div>
      </main>

      {showPalette && (
        <PersonalCommandPalette entries={paletteEntries} onClose={() => setShowPalette(false)} />
      )}
      {showGuide && <PersonalGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}

/**
 * Workflow guide and keyboard accelerators for the personal work OS.
 */
function PersonalGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const workflowSteps = [
    {
      step: '01',
      title: t('pwStepClientsTitle'),
      desc: t('pwStepClientsDesc'),
      icon: <Users className="w-4 h-4 text-[color:var(--accent-text)]" />
    },
    {
      step: '02',
      title: t('pwStepProjectsTitle'),
      desc: t('pwStepProjectsDesc'),
      icon: <FolderKanban className="w-4 h-4 text-[color:var(--accent-text)]" />
    },
    {
      step: '03',
      title: t('pwStepScopeTitle'),
      desc: t('pwStepScopeDesc'),
      icon: <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    },
    {
      step: '04',
      title: t('pwStepFocusTitle'),
      desc: t('pwStepFocusDesc'),
      icon: <Timer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    },
    {
      step: '05',
      title: t('pwStepMoneyTitle'),
      desc: t('pwStepMoneyDesc'),
      icon: <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    },
    {
      step: '06',
      title: t('pwStepCapacityTitle'),
      desc: t('pwStepCapacityDesc'),
      icon: <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9', label: t('pwShortcutTab') },
    { key: 'Alt + 0', label: t('pwShortcutTab') },
    { key: 'Ctrl/⌘ + PgUp / PgDn', label: t('pwShortcutCycleTab') },
    { key: 'F1', label: t('pwShortcutGuide') },
    { key: 'Esc', label: t('pwShortcutEsc') },
    { key: 'Ctrl/⌘ + K', label: t('pwShortcutPalette') }
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[color:var(--accent-tint)] text-[color:var(--accent-text)] flex items-center justify-center border border-[color:var(--accent-line)]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('pwGuideTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('pwGuideSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('pwClose')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]">
                    {item.step}
                  </span>
                  {item.icon}
                </div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  {item.title}
                </h4>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-[color:var(--accent-text)]" />
              {t('pwGuideShortcuts')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                    {sc.label}
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('pwGuideFooter')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)] active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('pwGotIt')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
