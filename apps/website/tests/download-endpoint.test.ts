import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression tests for the download endpoint.
 *
 * `module` used to be passed straight through to `dispatchBuild`, which POSTs a
 * workflow_dispatch to GitHub. Any anonymous caller could send any string and
 * start a CI run, as often as they liked — the endpoint had no validation and no
 * throttle.
 *
 * Two boundaries are mocked on purpose: `@/lib/build` because the real resolver
 * makes a network request to check whether an artifact exists, and
 * `next/headers` because `cookies()` needs a live Next request scope. Neither is
 * what changed here.
 */

const mocks = vi.hoisted(() => ({ resolveDownload: vi.fn() }))

vi.mock('@/lib/build', () => ({
  resolveDownload: mocks.resolveDownload,
  isBuildConfigured: () => false,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))

const { POST, GET } = await import('@/app/api/download/route')
const { resetRateLimits } = await import('@/lib/rate-limit')

function post(body: unknown, ip = '203.0.113.10') {
  return POST(
    new Request('https://www.bizflow.medhatjachour.tech/api/download', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    })
  )
}

function get(query: string, ip = '203.0.113.10') {
  return GET(
    new Request(`https://www.bizflow.medhatjachour.tech/api/download?${query}`, {
      headers: { 'x-forwarded-for': ip },
    })
  )
}

beforeEach(() => {
  resetRateLimits()
  mocks.resolveDownload.mockReset()
  mocks.resolveDownload.mockResolvedValue({
    state: 'fallback',
    url: 'https://github.com/medhatjachour/BizFlow/releases',
    fileName: 'BizFlow-Suite-windows.exe',
    productName: 'BizFlow',
  })
})

afterEach(() => {
  resetRateLimits()
})

describe('download: module validation', () => {
  it('rejects an unknown module instead of dispatching a build', async () => {
    const res = await post({ module: '../../evil', os: 'windows' })

    expect(res.status).toBe(400)
    // The whole point: nothing reached the build resolver.
    expect(mocks.resolveDownload).not.toHaveBeenCalled()
  })

  it('rejects an arbitrary string as the module', async () => {
    const res = await post({ module: 'not-a-real-module', os: 'windows' })

    expect(res.status).toBe(400)
    expect(mocks.resolveDownload).not.toHaveBeenCalled()
  })

  it('accepts a real catalogue module', async () => {
    const res = await post({ module: 'commerce', os: 'windows' })

    expect(res.status).toBe(200)
    expect(mocks.resolveDownload).toHaveBeenCalledWith('commerce', 'windows', { triggerBuild: true })
  })

  it('accepts the suite bundle', async () => {
    const res = await post({ module: 'suite', os: 'mac' })

    expect(res.status).toBe(200)
  })

  it('validates the module on the polling GET as well', async () => {
    const bad = await get('module=not-a-real-module&os=windows')
    expect(bad.status).toBe(400)

    const good = await get('module=commerce&os=windows')
    expect(good.status).toBe(200)
  })

  it('still rejects an invalid os', async () => {
    const res = await post({ module: 'commerce', os: 'solaris' })

    expect(res.status).toBe(400)
    expect(mocks.resolveDownload).not.toHaveBeenCalled()
  })
})

describe('download: build throttling', () => {
  it('allows a normal burst and refuses the loop', async () => {
    let lastStatus = 0

    for (let i = 0; i < 10; i++) {
      const res = await post({ module: 'suite', os: 'windows' })
      lastStatus = res.status
      expect(res.status).toBe(200)
    }

    const limited = await post({ module: 'suite', os: 'windows' })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBeTruthy()
    expect(lastStatus).toBe(200)
  })

  it('tracks callers separately', async () => {
    for (let i = 0; i < 11; i++) {
      await post({ module: 'suite', os: 'windows' }, '198.51.100.7')
    }
    expect((await post({ module: 'suite', os: 'windows' }, '198.51.100.7')).status).toBe(429)

    // A different visitor is unaffected.
    expect((await post({ module: 'suite', os: 'windows' }, '198.51.100.8')).status).toBe(200)
  })

  it('does not throttle polling, or every download would break', async () => {
    // The client polls every 5s for up to 15 minutes, so ~180 requests.
    for (let i = 0; i < 60; i++) {
      const res = await get('module=suite&os=windows')
      expect(res.status).toBe(200)
    }
  })
})
