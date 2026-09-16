import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The site fires funnel events for every step a visitor can take, and the
 * provider is switched on with an environment variable. Both halves fail
 * silently by design:
 *
 *   - `track()` is a no-op when no provider is configured or the visitor
 *     declined consent, so a missing call site costs nothing at build time and
 *     nothing at runtime - it just means the step is invisible forever.
 *   - `ANALYTICS_ENABLED` is false unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` or
 *     `NEXT_PUBLIC_GA_ID` is set, and the consent banner does not render either.
 *
 * So the events are asserted against the components that own the step, in the
 * order a visitor walks them. The narrative version of this file is the
 * "Measuring the funnel" section of `docs/WEBSITE_USER_FLOW.md`.
 */

const ROOT = path.join(__dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'website')

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(SITE, ...segments), 'utf8')
}

const LANDING = ['src', 'components', 'landing'] as const
const DESKTOP = ['src', 'components', 'desktop'] as const
const SUPPORT = ['src', 'components', 'support'] as const

describe('every funnel step reports itself', () => {
  it('reports the demo being opened', () => {
    const desktop = read(...DESKTOP, 'Desktop.tsx')
    expect(desktop).toContain('track("demo_open")')
    // The module the visitor lands on and each one they switch to.
    expect(desktop).toContain('track("demo_module_view"')
  })

  it('reports the custom-feature lead, including whether mail went out', () => {
    const form = read(...LANDING, 'RequestForm.tsx')
    expect(form).toContain('track("custom_request_submitted"')
    // `notified` is what turns a silent SMTP outage into a visible metric
    // instead of a customer who asked for a quote and never heard back.
    expect(form).toMatch(/notified: Boolean\(data\.notified\)/)
    expect(form).toContain('track("custom_request_failed"')
  })

  it('reports a licence ask, which arrives as a support ticket', () => {
    const form = read(...SUPPORT, 'SupportTicketForm.tsx')
    expect(form).toContain('track("support_ticket_submitted"')
    expect(form).toContain('track("support_ticket_failed"')
  })

  it('reports the download step', () => {
    const button = read('src', 'components', 'DownloadButton.tsx')
    expect(button).toContain('track("download_start"')
    expect(button).toContain('track("download_request"')
    expect(button).toContain('track("download_fallback"')
  })

  it('reports the optional card checkout without making it required', () => {
    const button = read('src', 'components', 'BuyButton.tsx')
    expect(button).toContain('track("checkout_start"')
    expect(button).toContain('track("checkout_redirect"')
  })
})

describe('tracking cannot run before the visitor opts in', () => {
  const analytics = read('src', 'lib', 'analytics.ts')

  it('requires consent before calling a provider', () => {
    expect(analytics).toMatch(/getConsent\(\) !== "granted"\) return/)
  })

  it('loads no provider script unless one is configured', () => {
    const banner = read('src', 'components', 'Analytics.tsx')
    expect(banner).toContain('if (!ANALYTICS_ENABLED || !mounted) return null')
  })

  it('is mounted for every route', () => {
    expect(read('src', 'app', 'layout.tsx')).toContain('<Analytics />')
  })
})

describe('the events are inert until a provider is enabled', () => {
  it('reports ANALYTICS_ENABLED as false with no provider configured', async () => {
    const mod = await import('../src/lib/analytics')
    expect(mod.ANALYTICS_ENABLED).toBe(
      Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || process.env.NEXT_PUBLIC_GA_ID)
    )
  })
})
