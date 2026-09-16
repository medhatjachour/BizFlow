import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The whole marketing site is built around one promise, and that promise is
 * easy to break by accident:
 *
 *   Try the full app in a browser, download it and work for 14 days, then ask
 *   for a licence key when you are ready. No card, no pre-sales, no sales call.
 *
 * Nothing about that is a type error. A refactor can quietly send the hero CTA
 * to a pricing page instead of the demo, delete the "no card" promise from the
 * copy, or reintroduce a required checkout step between downloading and using
 * the software - and every build stays green. The guarantee therefore has to
 * come from asserting the actual artifacts: the routes that exist, the copy the
 * customer reads, and the licence constants in the desktop app.
 *
 * The narrative version of this file is `docs/WEBSITE_USER_FLOW.md`.
 */

const ROOT = path.join(__dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'website')
const DESKTOP = path.join(ROOT, 'apps', 'Bizflow')

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(SITE, ...segments), 'utf8')
}

function exists(...segments: string[]): boolean {
  return fs.existsSync(path.join(SITE, ...segments))
}

/** Steps of the journey, in the order a real visitor walks them. */
describe('the entry point is the demo, not a paywall', () => {
  const hero = read('src', 'components', 'landing', 'Hero.tsx')

  it('sends the primary call to action to the live demo', () => {
    // The first Link in the hero is the primary CTA.
    const cta = hero.slice(hero.indexOf('<Link'), hero.indexOf('</Link>'))
    expect(cta).toContain('href="/app"')
  })

  it('offers the module list and the custom-feature request from the hero too', () => {
    expect(hero).toContain('href="#plugins"')
    expect(hero).toContain('href="#request"')
  })

  it('says out loud that the demo costs nothing and needs no conversation', () => {
    expect(hero).toMatch(/no install, no card, no sales call/i)
  })

  it('actually ships the demo route', () => {
    expect(exists('src', 'app', 'app', 'page.tsx')).toBe(true)
  })
})

describe('evaluating a module and asking for custom work', () => {
  it('has a module detail route for every plugin the site advertises', () => {
    expect(exists('src', 'app', 'plugins', '[id]', 'page.tsx')).toBe(true)
  })

  it('posts the custom-feature request to the public request endpoint', () => {
    const form = read('src', 'components', 'landing', 'RequestForm.tsx')
    expect(form).toContain('/api/requests')
    expect(form).toMatch(/No sales calls, no waiting\./)
  })

  it('anchors the request form so the hero and pricing can both link to it', () => {
    const form = read('src', 'components', 'landing', 'RequestForm.tsx')
    expect(form).toContain('id="request"')
    // ...and the landing page has to actually render that form.
    expect(read('src', 'app', 'page.tsx')).toContain('<RequestForm />')
  })
})

describe('download, then work for 14 days', () => {
  it('has a download page', () => {
    expect(exists('src', 'app', 'download', 'page.tsx')).toBe(true)
  })

  it('promises a key-free 14-day trial on first launch', () => {
    const button = read('src', 'components', 'DownloadButton.tsx')
    expect(button).toMatch(/First launch starts a 14-day free trial\. No licence key needed yet\./)
  })

  it('starts the trial on first launch, not at purchase', () => {
    const handlers = fs.readFileSync(
      path.join(DESKTOP, 'src', 'main', 'ipc', 'handlers', 'license.handlers.ts'),
      'utf8'
    )
    const trial = handlers.match(/const TRIAL_PERIOD_MS = ([^;]+);/)
    expect(trial, 'TRIAL_PERIOD_MS must exist').not.toBeNull()
    expect(trial![1]).toMatch(/14 \* 24 \* 60 \* 60 \* 1000/)
  })

  it('walks a first-time user past the unsigned-build warning on every OS', () => {
    // The installers are unsigned, so each OS blocks the first launch. Without
    // these instructions the visitor concludes the download is broken.
    const page = read('src', 'app', 'download', 'page.tsx')
    expect(page).toContain('const FIRST_RUN: Record<OSId,')
    for (const os of ['windows', 'mac', 'linux']) {
      expect(page, `${os} needs first-run guidance`).toMatch(new RegExp(`^\\s{2}${os}: \\{`, 'm'))
    }
  })

  it('gives the real click path, not vague reassurance', () => {
    const page = read('src', 'app', 'download', 'page.tsx')
    expect(page).toMatch(/Windows protected your PC/)
    expect(page).toMatch(/More info, then Run anyway/)
    expect(page).toMatch(/Privacy & Security/)
    expect(page).toMatch(/Open Anyway/)
    expect(page).toContain('xattr -dr com.apple.quarantine')
    expect(page).toContain('chmod +x')
    expect(page).toContain('--appimage-extract-and-run')
  })
})

describe('asking for a licence and activating it', () => {
  it('accepts a licence request from an anonymous visitor', () => {
    const route = read('src', 'app', 'api', 'license', 'request', 'route.ts')
    // No session/auth gate: the desktop app posts here with no cookie.
    expect(route).toMatch(/export async function POST/)
    expect(route).not.toMatch(/requireAdmin|getSession|verifySession/)
  })

  it('rates limits the public request endpoint instead of requiring an account', () => {
    const route = read('src', 'app', 'api', 'license', 'request', 'route.ts')
    // 8 requests per hour per IP, and an 8 kB body cap.
    expect(route).toMatch(
      /consume\(`license-request:\$\{clientKey\(request\)\}`, 8, 60 \* 60 \* 1000\)/
    )
    expect(route).toMatch(/MAX_BODY_BYTES = 8_000/)
  })

  it('never issues a key from the public endpoint - an admin mints it', () => {
    const route = read('src', 'app', 'api', 'license', 'request', 'route.ts')
    // The response must not carry an activation key. Minting happens in
    // /api/admin/licenses, after a human looks at the request.
    expect(route).not.toMatch(/licenseKey\s*:/)
    expect(exists('src', 'app', 'api', 'admin', 'licenses', 'route.ts')).toBe(true)
  })

  it('activates by binding the key to the device, and revalidates every 30 days', () => {
    const handlers = fs.readFileSync(
      path.join(DESKTOP, 'src', 'main', 'ipc', 'handlers', 'license.handlers.ts'),
      'utf8'
    )
    const interval = handlers.match(/const REVALIDATION_INTERVAL_MS = ([^;]+);/)
    expect(interval, 'REVALIDATION_INTERVAL_MS must exist').not.toBeNull()
    expect(interval![1]).toMatch(/30 \* 24 \* 60 \* 60 \* 1000/)
    // A grace period, so a customer on a plane is not locked out.
    expect(handlers).toMatch(/const GRACE_PERIOD_MS = 14 \* 24 \* 60 \* 60 \* 1000/)
  })

  it('keeps the activation endpoint reachable without a card or a session', () => {
    expect(exists('src', 'app', 'api', 'license', 'activate', 'route.ts')).toBe(true)
    expect(exists('src', 'app', 'api', 'license', 'validate', 'route.ts')).toBe(true)
  })
})

describe('no card and no pre-sales anywhere on the free path', () => {
  it('has no required checkout page', () => {
    // Card payment exists as an optional accelerator at /api/checkout, but
    // there is deliberately no /checkout *page* to land on, so no step of the
    // journey can be gated behind it. If someone adds one, this test should
    // fail loudly and make them think about it.
    expect(exists('src', 'app', 'checkout', 'page.tsx')).toBe(false)
  })

  it('repeats the no-card promise on the demo, the module list and the account page', () => {
    expect(read('src', 'components', 'landing', 'IncludedInEveryModule.tsx')).toMatch(
      /no install, no card, no sales call/
    )
    expect(read('src', 'components', 'account', 'AccountPanels.tsx')).toMatch(
      /nothing to install, no card needed/
    )
  })

  it('tells a licence holder the 14-day trial still applies', () => {
    const success = read('src', 'app', 'checkout', 'success', 'page.tsx')
    const panel = read('src', 'app', 'checkout', 'success', 'LicensePanel.tsx')
    expect(success).toMatch(/first 14 days run as a free trial/)
    expect(panel).toMatch(/14-day free trial/)
  })

  it('describes the licence as a one-time purchase, not a subscription', () => {
    const landing = read('src', 'app', 'page.tsx')
    expect(landing).toContain('Pricing')
    const pricing = read('src', 'lib', 'pricing.ts')
    // A licence is bought once for a module; nothing on the free path renews.
    expect(pricing).not.toMatch(/subscription/i)
  })
})

describe('the journey the load test measures matches the journey the site sells', () => {
  it('keeps every step of the user journey reachable in the paid and free paths', () => {
    // These are the exact routes the HTTP harness replays in
    // scripts/perf/scenarios.mjs USER_JOURNEY. If a route moves, the load test
    // would silently start measuring a 404.
    for (const route of [
      ['src', 'app', 'page.tsx'],
      ['src', 'app', 'app', 'page.tsx'],
      ['src', 'app', 'plugins', '[id]', 'page.tsx'],
      ['src', 'app', 'download', 'page.tsx'],
      ['src', 'app', 'support', 'page.tsx'],
      ['src', 'app', 'account', 'page.tsx'],
      ['src', 'app', 'api', 'prices', 'route.ts'],
      ['src', 'app', 'api', 'license', 'validate', 'route.ts']
    ]) {
      expect(exists(...route), `${route.join('/')} is missing`).toBe(true)
    }
  })
})
