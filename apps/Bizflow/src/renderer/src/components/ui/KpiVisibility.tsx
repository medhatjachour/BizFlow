/**
 * KPI layout components.
 *
 * The switch itself — three levels, persisted, viewport-aware — lives in
 * `kpiVisibilityStore.ts`. This file is only the two things that render it:
 * the provider that hands the value down, and the blocks that read it.
 *
 * `KpiSection` wraps one KPI block. The block itself (usually the grid element)
 * is the child so the wrapper never takes part in the parent's grid layout.
 * A visible block keeps its original footprint: the switch floats in the block's
 * top-end corner and only appears on hover or focus, so a page with five KPI
 * strips does not grow five extra toolbars. A hidden block keeps a slim
 * placeholder strip so it can always be brought back.
 */

import { type ReactNode } from 'react'
import { BarChart2, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  KpiVisibilityContext,
  useKpiSection,
  useKpiVisibility,
  useKpiVisibilityValue
} from './kpiVisibilityStore'

export function KpiVisibilityProvider({ children }: { children: ReactNode }) {
  const value = useKpiVisibilityValue()
  return <KpiVisibilityContext.Provider value={value}>{children}</KpiVisibilityContext.Provider>
}

interface KpiSectionProps {
  /** Unique `<plugin>:<tab-or-block>` key that the preference is stored under. */
  sectionKey: string
  /**
   * What this block is called, for screen readers and for the placeholder a
   * hidden block shows. Not drawn above a visible block: the page already has
   * its own heading, and adding one would move the cards it is meant to keep
   * still.
   */
  label?: string
  className?: string
  children: ReactNode
}

/**
 * Wraps one KPI block, so the header switch and this block's own chip can hide
 * it. Renders the placeholder instead of the cards while hidden.
 */
export function KpiSection({ sectionKey, label, className, children }: KpiSectionProps) {
  const { t } = useLanguage()
  const { visible, toggle } = useKpiSection(sectionKey)
  const hideLabel = `${t('kpiHideSection')}${label ? ` – ${label}` : ''}`
  const showLabel = `${t('kpiShowSection')}${label ? ` – ${label}` : ''}`

  if (!visible) {
    return (
      <section className={className} data-kpi-section={sectionKey} data-kpi-hidden="true">
        <div className="flex h-9 items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 px-3 dark:border-slate-700">
          <span className="min-w-0 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
            {label ?? t('kpiSectionHidden')}
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label={showLabel}
            title={showLabel}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{t('kpiShowSection')}</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`group/kpi relative ${className ?? ''}`}
      data-kpi-section={sectionKey}
      data-kpi-hidden="false"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={hideLabel}
        title={hideLabel}
        className="absolute end-1 top-1 z-10 flex items-center gap-1 rounded-lg bg-white/90 p-1 text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-200 backdrop-blur transition-opacity hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/kpi:opacity-100 dark:bg-slate-800/90 dark:text-slate-400 dark:ring-slate-700 dark:hover:text-slate-100"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
      {children}
    </section>
  )
}

/** The app-header switch that hides or shows every KPI block at once. */
export function KpiToggleButton({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  const { allVisible, toggleAll, autoMode } = useKpiVisibility()
  const label = allVisible ? t('kpiHideAll') : t('kpiShowAll')

  return (
    <button
      type="button"
      onClick={toggleAll}
      aria-pressed={!allVisible}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        allVisible
          ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          : 'bg-primary/10 text-primary'
      } ${className}`}
    >
      <span className="relative flex items-center">
        <BarChart2 className="h-5 w-5" />
        {!allVisible && (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex h-5 w-5 items-center justify-center"
          >
            <span className="h-px w-5 rotate-45 rounded bg-current" />
          </span>
        )}
      </span>
      {autoMode && <span className="sr-only">{t('kpiAutoHint')}</span>}
    </button>
  )
}
