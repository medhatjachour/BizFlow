/**
 * Dashboard shortcuts must land somewhere real.
 *
 * Plugin shells own their tabs (`export type GymTab = 'trainees' | ...`) and
 * expose them over a window event, so a shortcut has exactly two legal shapes:
 * activate one of that plugin's tabs, or navigate to a route `App.tsx` declares.
 *
 * The gym dashboard shipped with neither. It called `navigate('/gym/members')`
 * and friends, but the router only declares `/gym`, and the unknown-route
 * fallback redirects to `/` — so a dozen KPI tiles and quick actions silently
 * ejected the user back to the plugin selector. `App.tsx` alone cannot catch
 * this: every one of those paths is a valid *string*, just not a valid *route*.
 *
 * Three invariants are guarded, because none is visible to the others:
 *
 *   1. Every navigation target in the two plugin dashboards resolves — either a
 *      declared route or a tab the plugin shell would accept.
 *   2. Every `tab:` literal names a tab the plugin actually declares.
 *   3. The event `openPluginTab` dispatches is the event the shell listens for
 *      (a renamed channel would otherwise degrade to a dead click, silently).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import { followPluginTarget, openPluginTab } from '../../renderer/src/utils/pluginTabs'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const pluginsSrc = join(rendererSrc, 'plugins')

function filesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full))
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

/** Route paths `App.tsx` actually declares. */
function declaredRoutes(): Set<string> {
  const app = readFileSync(join(rendererSrc, 'App.tsx'), 'utf8')
  const routes = new Set<string>()
  for (const match of app.matchAll(/\bpath=["']([^"']+)["']/g)) routes.add(match[1])
  return routes
}

/** Tab ids a plugin shell declares, read from its `export type <Name> =` union. */
function declaredTabs(shellFile: string, typeName: string): Set<string> {
  const source = readFileSync(shellFile, 'utf8')
  const start = source.indexOf(`export type ${typeName} =`)
  expect(start, `${typeName} is not exported from ${shellFile}`).toBeGreaterThanOrEqual(0)
  const union = source.slice(start, source.indexOf('\n\n', start))
  return new Set([...union.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]))
}

/**
 * Absolute path literals used as navigation targets: `navigate('/x')`,
 * `to="/x"`, and `route:`/`to:` object properties fed to a navigate call.
 */
function navigationTargets(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const targets: string[] = []
  for (const pattern of [
    /\bnavigate\(\s*[`'"]([^`'"]*)[`'"]/g,
    /\bto=["']([^"']+)["']/g,
    /\b(?:route|to):\s*['"]([^'"]+)['"]/g
  ]) {
    for (const match of source.matchAll(pattern)) targets.push(match[1])
  }
  return targets
}

const gymDashboard = join(pluginsSrc, 'gym', 'dashboard')
const warehouseDashboard = join(pluginsSrc, 'warehouse', 'dashboard')
const dashboards = [
  { plugin: 'gym' as const, root: gymDashboard, shell: join(pluginsSrc, 'gym', 'index.tsx'), tabType: 'GymTab' },
  {
    plugin: 'warehouse' as const,
    root: warehouseDashboard,
    shell: join(pluginsSrc, 'warehouse', 'pages', 'index.tsx'),
    tabType: 'Tab'
  }
]

describe('plugin dashboard navigation targets', () => {
  const routes = declaredRoutes()

  it.each(dashboards)('every $plugin navigation target is reachable', ({ root }) => {
    const unreachable: string[] = []
    for (const file of filesUnder(root)) {
      for (const target of navigationTargets(file)) {
        // A tab target is never a path, and query/hash suffixes do not change
        // which route matches.
        const pathname = target.split(/[?#]/)[0]
        if (!pathname.startsWith('/')) continue
        if (!routes.has(pathname)) unreachable.push(`${target} (in ${file.slice(rendererSrc.length + 1)})`)
      }
    }
    expect(unreachable).toEqual([])
  })

  it.each(dashboards)('every $plugin `tab:` target is a tab the shell declares', ({ root, shell, tabType }) => {
    const tabs = declaredTabs(shell, tabType)
    const unknown: string[] = []
    for (const file of filesUnder(root)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/\btab:\s*['"]([a-zA-Z]+)['"]/g)) {
        if (!tabs.has(match[1])) unknown.push(`${match[1]} (in ${file.slice(rendererSrc.length + 1)})`)
      }
    }
    expect(unknown).toEqual([])
  })

  it.each(dashboards)('$plugin shell listens on the channel openPluginTab emits', ({ plugin, shell }) => {
    // Catches a renamed/typo'd channel, which would otherwise be a silent no-op.
    const listeners = readFileSync(shell, 'utf8')
    expect(listeners).toContain(`'bizflow:${plugin}:open-tab'`)

    const received: string[] = []
    const onTab = (event: Event): void => {
      received.push((event as CustomEvent<string>).detail)
    }
    window.addEventListener(`bizflow:${plugin}:open-tab`, onTab)
    try {
      openPluginTab(plugin, 'example-tab')
    } finally {
      window.removeEventListener(`bizflow:${plugin}:open-tab`, onTab)
    }
    expect(received).toEqual(['example-tab'])
  })
})

describe('followPluginTarget', () => {
  it('activates the tab and does not navigate when a tab target is given', () => {
    const navigate = vi.fn()
    const received: string[] = []
    const onTab = (event: Event): void => {
      received.push((event as CustomEvent<string>).detail)
    }
    window.addEventListener('bizflow:gym:open-tab', onTab)

    try {
      followPluginTarget('gym', { tab: 'trainees' }, navigate)
    } finally {
      window.removeEventListener('bizflow:gym:open-tab', onTab)
    }

    expect(received).toEqual(['trainees'])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates when only a route target is given', () => {
    const navigate = vi.fn()
    followPluginTarget('warehouse', { to: '/reports' }, navigate)
    expect(navigate).toHaveBeenCalledWith('/reports')
  })

  it('does nothing when the target is empty', () => {
    const navigate = vi.fn()
    followPluginTarget('warehouse', {}, navigate)
    expect(navigate).not.toHaveBeenCalled()
  })
})
