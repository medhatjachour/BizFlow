import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import LicenseActivation from '../../../renderer/src/pages/Settings/LicenseActivation'
import LicenseGate from '../../../renderer/src/components/LicenseGate'
import { activationErrorText, licenseStrings } from '../../../renderer/src/components/license/licenseStrings'
import { formatDate } from '../../../renderer/src/lib/format'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'

/**
 * Behavioural coverage for the two licence screens.
 *
 * The licence panel is the one screen a locked-out customer cannot skip, and the
 * licence server answers in English while the app is Arabic by default. These
 * tests pin the two things that regressed most often: server errors surfacing
 * untranslated, and results being announced in the wrong card.
 */

const DEVICE_ID = 'D7574401769BD1EF3F85AB6704BBFEF667802838AE14982CF01CFECF3AD00009'
const KEY = 'BIZ-0B74R-0DEFC-CZXAA-FVT9F'

function activatedState() {
  return {
    status: 'active',
    activated: true,
    deviceFingerprint: DEVICE_ID,
    deviceName: 'mga (win32-x64)',
    daysUntilExpiry: 30,
    revalidationDue: false,
    nextRevalidationAt: '2026-10-14T00:00:00.000Z',
    activation: {
      email: 'medhatashour19@gmail.com',
      licenseKey: KEY,
      itemId: 'module:commerce',
      deviceFingerprint: DEVICE_ID,
      deviceName: 'mga (win32-x64)',
      issuedAt: '2026-09-14T00:00:00.000Z',
      expiresAt: '2026-10-14T00:00:00.000Z',
      lastValidatedAt: '2026-09-14T00:00:00.000Z',
    },
  }
}

interface ApiStub {
  getState: ReturnType<typeof vi.fn>
  activateOnline: ReturnType<typeof vi.fn>
  validateOnline: ReturnType<typeof vi.fn>
  onStateChanged: ReturnType<typeof vi.fn>
}

function stubApi(state: unknown): ApiStub {
  const api: ApiStub = {
    getState: vi.fn().mockResolvedValue(state),
    activateOnline: vi.fn(),
    validateOnline: vi.fn().mockResolvedValue({ valid: true, checked: true }),
    onStateChanged: vi.fn().mockReturnValue(() => {}),
  }
  ;(window as unknown as { api: unknown }).api = { license: api, modules: { getEnabled: vi.fn().mockResolvedValue([]) } }
  return api
}

function renderAr(node: React.ReactNode) {
  localStorage.setItem('language', 'ar')
  return render(<LanguageProvider>{node}</LanguageProvider>)
}

function renderEn(node: React.ReactNode) {
  localStorage.setItem('language', 'en')
  return render(<LanguageProvider>{node}</LanguageProvider>)
}

const ar = licenseStrings(true)

beforeEach(() => {
  localStorage.setItem('language', 'ar')
})

describe('licence panel', () => {
  it('shows the activated receipt once, without repeating the schedule', async () => {
    stubApi(activatedState())
    const { container } = renderAr(<LicenseActivation />)

    expect(await screen.findByText(KEY)).toBeInTheDocument()
    expect(screen.getByText('medhatashour19@gmail.com')).toBeInTheDocument()

    // key, licensed-to, issued, expires, last checked — the "next automatic
    // check" row used to say the same date as the expiry row for a third time.
    expect(container.querySelectorAll('dt')).toHaveLength(5)

    const nextCheck = formatDate('2026-10-14T00:00:00.000Z', 'ar')
    expect(container.textContent).toContain(ar.nextCheckOn(nextCheck))
  })

  it('has nothing to check before the device is activated', async () => {
    stubApi({ status: 'trial', activated: false, trialDaysLeft: 9, deviceFingerprint: DEVICE_ID })
    renderAr(<LicenseActivation />)

    const matches = await screen.findAllByText(ar.notActivated)
    expect(matches.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: ar.revalidate })).toBeNull()
    // The support route is always reachable, even with nothing to check.
    expect(screen.getByRole('link', { name: ar.emailSupport })).toBeInTheDocument()
  })

  it('reports a failed activation in the form card, in Arabic', async () => {
    const api = stubApi(activatedState())
    api.activateOnline.mockResolvedValue({
      ok: false,
      error: 'License is already activated on another device',
      code: 'LOCKED_TO_OTHER_DEVICE',
      currentDeviceName: 'DESKTOP-OLD',
    })
    renderAr(<LicenseActivation />)

    const activateButton = await screen.findByRole('button', { name: ar.activateButton })
    fireEvent.change(screen.getByLabelText(ar.emailLabel), { target: { value: 'other@example.com' } })
    fireEvent.change(screen.getByLabelText(ar.keyLabel), { target: { value: KEY.toLowerCase() } })
    fireEvent.click(activateButton)

    const notice = await screen.findByText(ar.activateLockedToOtherDevice('DESKTOP-OLD'))
    expect(notice).toBeInTheDocument()
    // The raw English sentence must never reach an Arabic customer.
    expect(screen.queryByText('License is already activated on another device')).toBeNull()
    // …and it belongs next to the button that was pressed, not in the status card.
    expect(notice.closest('div.rounded-xl')?.contains(activateButton)).toBe(true)
    // The key is normalised before it goes out.
    expect(api.activateOnline).toHaveBeenCalledWith('other@example.com', KEY)
  })

  it('flags an obviously mistyped key before it costs a round trip', async () => {
    const api = stubApi(activatedState())
    renderAr(<LicenseActivation />)

    const keyInput = await screen.findByLabelText(ar.keyLabel)
    fireEvent.change(keyInput, { target: { value: 'BIZ-0B74R-0DEFC' } })
    expect(screen.getByText(ar.keyShapeWarning)).toBeInTheDocument()

    fireEvent.change(keyInput, { target: { value: KEY } })
    expect(screen.queryByText(ar.keyShapeWarning)).toBeNull()
    expect(api.activateOnline).not.toHaveBeenCalled()
  })

  it('does not claim success when the check never reached the server', async () => {
    const api = stubApi(activatedState())
    api.validateOnline.mockResolvedValue({ valid: true, checked: false })
    renderAr(<LicenseActivation />)

    fireEvent.click(await screen.findByRole('button', { name: ar.revalidate }))

    expect(await screen.findByText(ar.revalidateOffline)).toBeInTheDocument()
    expect(screen.queryByText(ar.revalidateOk)).toBeNull()
  })

  it('follows a background revalidation instead of showing the old receipt', async () => {
    const api = stubApi(activatedState())
    let push: (() => void) | null = null
    api.onStateChanged.mockImplementation((cb: () => void) => {
      push = cb
      return () => {}
    })
    const { container } = renderAr(<LicenseActivation />)
    expect(await screen.findByText(KEY)).toBeInTheDocument()

    // The main process revalidates on launch and every 30 days; it announces the
    // change rather than letting the panel wait for a remount.
    expect(api.onStateChanged).toHaveBeenCalledTimes(1)
    const renewed = activatedState()
    renewed.activation.lastValidatedAt = '2026-10-14T00:00:00.000Z'
    renewed.nextRevalidationAt = '2026-11-13T00:00:00.000Z'
    api.getState.mockResolvedValue(renewed)
    push!()

    const expected = ar.nextCheckOn(formatDate('2026-11-13T00:00:00.000Z', 'ar'))
    await waitFor(() => expect(container.textContent).toContain(expected))
    expect(api.getState).toHaveBeenCalledTimes(2)
  })

  it('lets an owner close the request form again', async () => {
    stubApi(activatedState())
    renderAr(<LicenseActivation />)

    const open = await screen.findByRole('button', { name: ar.tabRequest })
    expect(open).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(open)

    const close = screen.getByRole('button', { name: ar.close })
    expect(close).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText(ar.requestTitle)).toHaveLength(1)

    fireEvent.click(close)
    expect(screen.queryByText(ar.requestTitle)).toBeNull()
  })

  it('offers the modules shortcut only when that tab can actually be reached', async () => {
    stubApi(activatedState())
    const onOpenModules = vi.fn()
    const { unmount } = renderAr(<LicenseActivation onOpenModules={onOpenModules} />)

    fireEvent.click(await screen.findByRole('button', { name: ar.openModules }))
    expect(onOpenModules).toHaveBeenCalledTimes(1)
    unmount()

    // Settings only passes the handler when the Modules tab survives its own
    // filtering, so an unhandled panel must not show a dead button.
    renderAr(<LicenseActivation />)
    expect(await screen.findByText(KEY)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ar.openModules })).toBeNull()
  })

  it('names the licensed module in the language the reader is using', async () => {
    stubApi(activatedState())
    const en = licenseStrings(false)
    const { container } = renderEn(<LicenseActivation />)

    expect(await screen.findByText(KEY)).toBeInTheDocument()
    // The plan row printed the Arabic module name whatever the UI language was,
    // so an English owner read "وحدة المتجر module" directly above a module list
    // that said "Commerce".
    expect(container.textContent).toContain(en.planSingle('Commerce'))
    expect(container.textContent).not.toContain(en.planSingle('المتجر'))
  })
})

describe('licence gate', () => {
  it('localises a server-side activation failure', async () => {
    const api = stubApi({ status: 'trial_expired', deviceFingerprint: DEVICE_ID, deviceName: 'mga (win32-x64)' })
    api.activateOnline.mockResolvedValue({ ok: false, error: 'No paid license found for this email and key', code: 'NOT_FOUND' })
    renderAr(<LicenseGate><div>app</div></LicenseGate>)

    fireEvent.change(await screen.findByLabelText(ar.emailLabel), { target: { value: 'nobody@example.com' } })
    fireEvent.change(screen.getByLabelText(ar.keyLabel), { target: { value: KEY } })
    fireEvent.click(screen.getByRole('button', { name: ar.activateButton }))

    expect(await screen.findByText(ar.activateNotFound)).toBeInTheDocument()
    expect(screen.queryByText('No paid license found for this email and key')).toBeNull()
  })
})

describe('activationErrorText', () => {
  it('maps every code the licence server sends to our own copy', () => {
    expect(activationErrorText(ar, { code: 'LOCKED_TO_OTHER_DEVICE', currentDeviceName: 'OLD-PC' })).toBe(
      ar.activateLockedToOtherDevice('OLD-PC')
    )
    expect(activationErrorText(ar, { code: 'NOT_FOUND' })).toBe(ar.activateNotFound)
    expect(activationErrorText(ar, { code: 'RATE_LIMITED' })).toBe(ar.activateRateLimited)
    expect(activationErrorText(ar, { code: 'OFFLINE' })).toBe(ar.activateOffline)
    expect(activationErrorText(ar, { code: 'STORAGE' })).toBe(ar.activateStorageFailed)
    expect(activationErrorText(ar, { code: 'SOMETHING_NEW' })).toBe(ar.activateFailed)
    expect(activationErrorText(ar, {})).toBe(ar.activateFailed)
  })

  it('keeps the two languages distinct so nothing is left in English', () => {
    const en = licenseStrings(false)
    expect(en.activateNotFound).not.toBe(ar.activateNotFound)
    expect(ar.activateNotFound).toContain('لم نجد')
    expect(ar.activateRateLimited).toContain('ربع ساعة')
  })
})
