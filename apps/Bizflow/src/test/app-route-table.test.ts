import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regression tests for the route table in App.tsx.
 *
 * `ClinicPatientProfile` used to be declared as `lazy(() => import('./plugins/clinic/pages'))`,
 * which is `pages/index.tsx` -- the exact same module as the `Clinic` dashboard on
 * the line above. Every profile link in the app (`/clinic/patients/:id`, wired up
 * from 7 call sites) therefore rendered the clinic dashboard and silently threw
 * away the patient id, and the whole `pages/patientProfile/` tree -- 16 files --
 * was unreachable dead code.
 *
 * These tests assert the shape of the route table rather than individual routes,
 * so the same copy-paste mistake can't reappear anywhere.
 */

const RENDERER_SRC = path.resolve(process.cwd(), 'src/renderer/src')
const APP_TSX = path.join(RENDERER_SRC, 'App.tsx')

const appSource = readFileSync(APP_TSX, 'utf8')

/** `const Foo = __PLUGIN_X__ ? lazy(() => import('./spec')) : null` */
function parseRouteComponents(source: string): Map<string, string> {
  const out = new Map<string, string>()
  const re = /const\s+(\w+)\s*=\s*(?:__PLUGIN_\w+__\s*\?\s*)?lazy\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) out.set(match[1], match[2])
  return out
}

function resolveModule(spec: string): string | null {
  const base = spec.startsWith('@renderer/')
    ? path.join(RENDERER_SRC, spec.slice('@renderer/'.length))
    : path.resolve(RENDERER_SRC, spec)

  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx')]) {
    if (existsSync(candidate) && !candidate.endsWith('\\')) {
      try {
        if (readFileSync(candidate, 'utf8').length >= 0) return candidate
      } catch {
        /* directory, keep looking */
      }
    }
  }
  return null
}

const components = parseRouteComponents(appSource)

describe('App route table: lazy component imports', () => {
  it('parses the route table (guards against a regex that silently matches nothing)', () => {
    expect(components.size).toBeGreaterThan(15)
    expect(components.get('ClinicPatientProfile')).toBeTruthy()
  })

  it('never points two routes at the same module', () => {
    // Compare *resolved* files, not specifier strings: the original bug was
    // './plugins/clinic/pages/index' vs './plugins/clinic/pages' -- different
    // strings, same file.
    const byFile = new Map<string, string[]>()
    for (const [name, spec] of components) {
      const file = resolveModule(spec) ?? `UNRESOLVED:${spec}`
      byFile.set(file, [...(byFile.get(file) ?? []), name])
    }

    const collisions = [...byFile.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([file, names]) => `${names.join(' + ')} both load ${path.relative(RENDERER_SRC, file)}`)

    expect(collisions).toEqual([])
  })
  it('resolves every lazy import to a real file', () => {
    const unresolved = [...components.entries()]
      .filter(([, spec]) => resolveModule(spec) === null)
      .map(([name, spec]) => `${name} -> ${spec}`)

    expect(unresolved).toEqual([])
  })
})

describe('App route table: :id routes receive the id', () => {
  /** Route blocks that declare a param, paired with the component they render. */
  const paramRoutes = (() => {
    const found: Array<{ component: string; routePath: string }> = []
    const re = /path="([^"]*:\w+[^"]*)"/g
    let match: RegExpExecArray | null

    while ((match = re.exec(appSource)) !== null) {
      // The element rendered by this <Route> sits right after the path.
      const after = appSource.slice(match.index, match.index + 600)
      for (const name of components.keys()) {
        if (new RegExp(`<${name}\\s*/>`).test(after)) {
          found.push({ component: name, routePath: match[1] })
          break
        }
      }
    }
    return found
  })()

  it('finds the parameterised routes', () => {
    expect(paramRoutes.length).toBeGreaterThan(0)
  })

  it('renders a component that actually reads the route param', () => {
    const offenders = paramRoutes
      .map(({ component, routePath }) => {
        const file = resolveModule(components.get(component)!)
        const source = file ? readFileSync(file, 'utf8') : ''
        return { component, routePath, usesParams: /useParams\s*[<(]/.test(source) }
      })
      .filter((r) => !r.usesParams)
      .map((r) => `${r.routePath} renders ${r.component}, which never calls useParams`)

    expect(offenders).toEqual([])
  })

  it('wires the clinic patient profile to the profile page, not the dashboard', () => {
    const spec = components.get('ClinicPatientProfile')

    expect(spec).toBe('./plugins/clinic/pages/patientProfile')
    expect(spec).not.toBe(components.get('Clinic'))
  })
})
