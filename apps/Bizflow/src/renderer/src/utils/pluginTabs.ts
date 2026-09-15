/**
 * Cross-component tab navigation for plugin shells.
 *
 * Plugin shells own their tab state and expose it over a window event so that
 * dashboards and other sections can jump straight to a tab without a route.
 * The shell validates the requested tab against the tabs the current user is
 * allowed to see, so unknown or forbidden ids are ignored.
 */
export type PluginTabHost = 'gym' | 'warehouse'

/** Destination for a dashboard shortcut: an in-plugin tab, or a top-level route. */
export interface PluginTabTarget {
  /** Tab id to activate inside the plugin shell. */
  tab?: string
  /** Top-level route, used for targets that live outside the plugin. */
  to?: string
}

/** Asks the plugin shell to activate a tab. */
export const openPluginTab = (host: PluginTabHost, tab: string): void => {
  window.dispatchEvent(new CustomEvent(`bizflow:${host}:open-tab`, { detail: tab }))
}

/** Resolves a shortcut target to either an in-plugin tab or a top-level navigate. */
export const followPluginTarget = (
  host: PluginTabHost,
  target: PluginTabTarget,
  navigate: (to: string) => void
): void => {
  if (target.tab) {
    openPluginTab(host, target.tab)
  } else if (target.to) {
    navigate(target.to)
  }
}
