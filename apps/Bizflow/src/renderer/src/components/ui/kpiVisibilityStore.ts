/**
 * KPI visibility state.
 *
 * KPI strips are the densest thing on nearly every plugin tab, and on a phone or
 * a narrow window they push the working area (catalogue, table, form) below the
 * fold. This module owns the one shared switch behind every KPI block, with
 * three levels resolved most-specific-first:
 *
 *   sections[key]   explicit choice for one section
 *   all             the global switch in the app header
 *   viewport        auto: shown from 1024px up, hidden below it
 *
 * `sections[key]` and `all` stay `undefined` until the user expresses a
 * preference, which is what keeps the viewport rule in charge by default.
 * Choosing the value the viewport would have picked anyway clears the override
 * again, so "auto" is always reachable by toggling twice.
 *
 * Sections are keyed `<plugin>:<tab-or-block>` and must be unique; the keys are
 * persisted user data and are asserted by `pluginKpiToggle.test.ts`.
 *
 * The components that consume this live in `KpiVisibility.tsx`. They are split
 * so that each file exports either hooks or components, which is what the
 * fast-refresh lint rule asks for.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const KPI_STORAGE_KEY = 'bizflow:kpi:visibility'

/** Above this width KPI blocks are shown while the user has no preference. */
const KPI_AUTO_QUERY = '(min-width: 1024px)'

interface KpiPrefs {
  all?: boolean
  sections: Record<string, boolean>
}

export interface KpiVisibilityValue {
  /** Whether this section should render its cards right now. */
  isVisible: (sectionKey: string) => boolean
  setVisible: (sectionKey: string, visible: boolean) => void
  toggle: (sectionKey: string) => void
  /** Whether every section renders, for the global switch. */
  allVisible: boolean
  setAllVisible: (visible: boolean) => void
  toggleAll: () => void
  /** True while the viewport rule decides (no stored preference at all). */
  autoMode: boolean
}

const EMPTY_PREFS: KpiPrefs = { sections: {} }

function readPrefs(): KpiPrefs {
  try {
    const raw = localStorage.getItem(KPI_STORAGE_KEY)
    if (!raw) return EMPTY_PREFS
    const parsed = JSON.parse(raw) as Partial<KpiPrefs>
    if (!parsed || typeof parsed !== 'object') return EMPTY_PREFS
    const sections: Record<string, boolean> = {}
    if (parsed.sections && typeof parsed.sections === 'object') {
      for (const [key, value] of Object.entries(parsed.sections)) {
        if (typeof value === 'boolean') sections[key] = value
      }
    }
    return { ...(typeof parsed.all === 'boolean' ? { all: parsed.all } : {}), sections }
  } catch {
    return EMPTY_PREFS
  }
}

function writePrefs(prefs: KpiPrefs): void {
  try {
    localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Private mode / quota: the in-memory value still drives the session.
  }
}

function viewportAllowsKpi(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(KPI_AUTO_QUERY).matches
}

function useViewportAllowsKpi(): boolean {
  const [allows, setAllows] = useState(viewportAllowsKpi)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(KPI_AUTO_QUERY)
    const update = (): void => setAllows(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return allows
}

/**
 * Outside a provider every section renders. Plugin screens are mounted bare by
 * tests and by a few modals, and they must keep working.
 */
const FALLBACK: KpiVisibilityValue = {
  isVisible: () => true,
  setVisible: () => {},
  toggle: () => {},
  allVisible: true,
  setAllVisible: () => {},
  toggleAll: () => {},
  autoMode: true
}

export const KpiVisibilityContext = createContext<KpiVisibilityValue>(FALLBACK)

export function useKpiVisibility(): KpiVisibilityValue {
  return useContext(KpiVisibilityContext)
}

export function useKpiSection(sectionKey: string): {
  visible: boolean
  toggle: () => void
  setVisible: (visible: boolean) => void
} {
  const { isVisible, setVisible, toggle } = useKpiVisibility()
  return useMemo(
    () => ({
      visible: isVisible(sectionKey),
      toggle: () => toggle(sectionKey),
      setVisible: (visible: boolean) => setVisible(sectionKey, visible)
    }),
    [isVisible, setVisible, toggle, sectionKey]
  )
}

/** The value the provider hands down, built from the stored preferences. */
export function useKpiVisibilityValue(): KpiVisibilityValue {
  const viewportAllows = useViewportAllowsKpi()
  const [prefs, setPrefs] = useState<KpiPrefs>(readPrefs)

  useEffect(() => {
    writePrefs(prefs)
  }, [prefs])

  const autoValue = prefs.all ?? viewportAllows

  const isVisible = useCallback(
    (sectionKey: string) => prefs.sections[sectionKey] ?? autoValue,
    [prefs.sections, autoValue]
  )

  const setVisible = useCallback(
    (sectionKey: string, visible: boolean) => {
      setPrefs((prev) => {
        const sections = { ...prev.sections }
        // Matching the inherited value means "no preference" -> back to auto.
        if (visible === (prev.all ?? viewportAllows)) delete sections[sectionKey]
        else sections[sectionKey] = visible
        return { all: prev.all, sections }
      })
    },
    [viewportAllows]
  )

  const toggle = useCallback(
    (sectionKey: string) => setVisible(sectionKey, !isVisible(sectionKey)),
    [isVisible, setVisible]
  )

  const setAllVisible = useCallback((visible: boolean) => {
    // A global choice wins over per-section overrides, so drop them.
    setPrefs({ all: visible, sections: {} })
  }, [])

  return useMemo(
    () => ({
      isVisible,
      setVisible,
      toggle,
      allVisible: prefs.all ?? viewportAllows,
      setAllVisible,
      toggleAll: () => setAllVisible(!(prefs.all ?? viewportAllows)),
      autoMode: prefs.all === undefined && Object.keys(prefs.sections).length === 0
    }),
    [isVisible, setVisible, toggle, prefs.all, prefs.sections, viewportAllows, setAllVisible]
  )
}
