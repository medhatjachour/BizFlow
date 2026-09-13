/**
 * LicenseGate
 *
 * Global gate that hard-blocks the app when the device is not licensed and the
 * free trial (or post-expiry grace window) has ended.
 *
 * States:
 *   trial          → app works, no gate
 *   active         → app works, no gate
 *   grace          → app works (with an in-app warning elsewhere), no gate
 *   trial_expired  → GATE (trial over)
 *   expired        → GATE (license invalid / grace over)
 *
 * The gate shows an activation form plus a "contact us" email link, as
 * requested. It never blocks the device before the first state resolves.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { KeyRound, Mail, ShieldAlert } from 'lucide-react'

type LicenseStatus = 'trial' | 'active' | 'grace' | 'expired' | 'trial_expired' | 'unknown'

interface LicenseState {
  status: LicenseStatus
  locked?: boolean
  trialDaysLeft?: number
  graceDaysLeft?: number
  deviceFingerprint?: string
  deviceName?: string
}

/**
 * Support inbox for activation requests.
 *
 * `support@bizflow.medhatjachour.tech` was unreachable: the domain publishes no
 * MX records, so mail to it bounces and the "contact us" link silently went
 * nowhere. This is the same inbox the website sends request notifications to.
 * Switch it back to a branded address once mail hosting exists.
 */
const SUPPORT_EMAIL = 'medhatjachour8@gmail.com'

export function useLicenseState(): { state: LicenseState; refresh: () => Promise<void> } {
  const [state, setState] = useState<LicenseState>({ status: 'unknown' })

  const refresh = async () => {
    try {
      const api = window.api?.license
      if (!api?.getState) {
        // No license bridge (web/dev without IPC) → do not gate.
        setState({ status: 'active' })
        return
      }
      const next = (await api.getState()) as LicenseState
      setState(next)
    } catch {
      // Fail open: never lock a user out because the IPC call failed.
      setState({ status: 'active' })
    }
  }

  useEffect(() => {
    void refresh()
    // Re-check periodically so a trial can expire while the app is open.
    const timer = setInterval(() => void refresh(), 15 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  // A background revalidation can change the stored activation. Without this the
  // UI would not notice until its next poll, so a freshly revalidated device
  // could sit on the activation gate for up to 15 minutes.
  useEffect(() => {
    const api = window.api?.license
    if (!api?.onStateChanged) return
    return api.onStateChanged(() => {
      void refresh()
    })
  }, [])

  return { state, refresh }
}

/**
 * Unmissable trial / grace indicator.
 *
 * The countdown previously existed only inside Settings → General, so nothing
 * warned a user that the trial or the post-expiry grace window was running out -
 * the app just locked them out one day.
 */
function TrialBadge({ state }: { state: LicenseState }) {
  if (state.status === 'trial' && state.trialDaysLeft != null) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 shadow-lg backdrop-blur">
        Free trial · {state.trialDaysLeft} day{state.trialDaysLeft === 1 ? '' : 's'} left
      </div>
    )
  }

  if (state.status === 'grace' && state.graceDaysLeft != null) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur">
        Revalidation overdue · {state.graceDaysLeft} day{state.graceDaysLeft === 1 ? '' : 's'} left
      </div>
    )
  }

  return null
}

export default function LicenseGate({ children }: { children: ReactNode }) {
  const { state, refresh } = useLicenseState()
  const [email, setEmail] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const blocked = state.status === 'trial_expired' || state.status === 'expired'

  async function handleActivate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.license.activateOnline(email.trim(), licenseKey.trim().toUpperCase())
      if (!result.ok) {
        setMessage(result.error ?? 'Activation failed')
        return
      }
      await refresh()
    } catch (err) {
      setMessage((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // While we don't yet know the state, don't flash the gate.
  if (state.status === 'unknown') return <>{children}</>

  if (!blocked) {
    return (
      <>
        <TrialBadge state={state} />
        {children}
      </>
    )
  }

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    'BizFlow license request'
  )}&body=${encodeURIComponent(
    `Hello, I would like a license for BizFlow.\n\nDevice: ${state.deviceName ?? ''}\nDevice ID: ${
      state.deviceFingerprint ?? ''
    }`
  )}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
        </div>

        <h1 className="text-center text-lg font-semibold text-slate-900 dark:text-white">
          {state.status === 'trial_expired' ? 'Your free trial has ended' : 'License required'}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Activate this device to keep using BizFlow. Your data is safe and nothing has been deleted.
        </p>

        <div className="mt-6 space-y-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Purchase email"
            autoComplete="email"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            placeholder="License key (BIZ-XXXXX-…)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950"
          />
        </div>

        <button
          disabled={busy || !email.trim() || !licenseKey.trim()}
          onClick={handleActivate}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? 'Activating…' : 'Activate this device'}
        </button>

        {message ? (
          <p className="mt-2 text-center text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>
        ) : null}

        <div className="mt-6 border-t border-slate-200 pt-4 text-center dark:border-slate-700">
          <a
            href={mailto}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            Contact us for a license
          </a>
          {state.deviceFingerprint ? (
            <p className="mt-3 break-all font-mono text-[10px] text-slate-400">
              Device ID: {state.deviceFingerprint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
