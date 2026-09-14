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
 * The gate shows two ways forward - enter a key you already have, or ask us for
 * one - states plainly that the customer's data is untouched, and shows the
 * Device ID we need to issue against so it never has to be hunted for.
 *
 * It is bilingual: the app defaults to Arabic, and an English-only dead end was
 * the worst possible screen to get that wrong on.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { BadgeCheck, KeyRound, LifeBuoy, Loader2, Mail, ShieldAlert, ShieldCheck } from 'lucide-react'

import { useLanguage } from '../contexts/LanguageContext'
import LicenceDeviceId from './license/LicenceDeviceId'
import LicenceRequestForm from './license/LicenceRequestForm'
import { licenseStrings, statusLabel } from './license/licenseStrings'
import { SUPPORT_EMAIL } from './help/support'

type LicenseStatus = 'trial' | 'active' | 'grace' | 'expired' | 'trial_expired' | 'unknown'

interface LicenseState {
  status: LicenseStatus
  locked?: boolean
  trialDaysLeft?: number
  graceDaysLeft?: number
  clockTampered?: boolean
  deviceFingerprint?: string
  deviceName?: string
  activation?: {
    email: string
    licenseKey: string
    itemId: string
    expiresAt: string
  }
}

/**
 * Support inbox for activation requests.
 *
 * `support@bizflow.medhatjachour.tech` was unreachable: the domain publishes no
 * MX records, so mail to it bounces and the "contact us" link silently went
 * nowhere. `components/help/support.ts` is now the single definition of the
 * working inbox — the copy that used to live here drifted from it.
 */

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
  const { language } = useLanguage()
  const strings = licenseStrings(language === 'ar')

  if (state.status === 'trial' && state.trialDaysLeft != null) {
    return (
      <div
        data-tour="trial-badge"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 shadow-lg backdrop-blur"
      >
        {strings.statusTrial} · {strings.trialDaysLeft(state.trialDaysLeft)}
      </div>
    )
  }

  if (state.status === 'grace' && state.graceDaysLeft != null) {
    return (
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur">
        {strings.statusGrace} · {strings.graceDaysLeft(state.graceDaysLeft)}
      </div>
    )
  }

  return null
}

export default function LicenseGate({ children }: { children: ReactNode }) {
  const { state, refresh } = useLicenseState()
  const { language } = useLanguage()
  const [tab, setTab] = useState<'activate' | 'request'>('activate')
  const [email, setEmail] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const blocked = state.status === 'trial_expired' || state.status === 'expired'
  const isAr = language === 'ar'
  const strings = licenseStrings(isAr)

  async function handleActivate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.license.activateOnline(email.trim(), licenseKey.trim().toUpperCase())
      if (!result.ok) {
        setMessage({ tone: 'bad', text: result.error ?? strings.activateFailed })
        return
      }
      setMessage({ tone: 'ok', text: strings.activateSuccess })
      await refresh()
    } catch (err) {
      setMessage({ tone: 'bad', text: (err as Error).message || strings.activateFailed })
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
    strings.gateSubject
  )}&body=${encodeURIComponent(
    strings.gateMailBody({
      device: state.deviceName ?? '',
      deviceId: state.deviceFingerprint ?? ''
    })
  )}`

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white'
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="rounded-t-2xl border border-b-0 border-slate-200 bg-white px-7 pt-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                state.status === 'trial_expired'
                  ? 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
              }`}
            >
              {state.status === 'trial_expired' ? (
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              ) : (
                <ShieldAlert className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {statusLabel(strings, state.status)}
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                {state.status === 'trial_expired' ? strings.gateTitleTrialEnded : strings.gateTitleLocked}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{strings.gateLead}</p>
            </div>
          </div>

          {/* Reassurance. Losing access to their records is the real fear here. */}
          <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50 p-3.5 dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <BadgeCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{strings.dataSafetyTitle}</p>
              <p className="mt-0.5 text-sm text-emerald-800/90 dark:text-emerald-300/80">{strings.dataSafetyBody}</p>
            </div>
          </div>

          <div className="mt-5 flex gap-1 border-b border-slate-200 dark:border-slate-800">
            {(['activate', 'request'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${
                  tab === value
                    ? 'border-primary text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {value === 'activate' ? strings.tabActivate : strings.tabRequest}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-b-2xl border border-slate-200 bg-white px-7 py-6 dark:border-slate-800 dark:bg-slate-900">
          {tab === 'activate' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{strings.activateTitle}</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{strings.activateLead}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>{strings.emailLabel}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={strings.emailPlaceholder}
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{strings.keyLabel}</span>
                  <input
                    value={licenseKey}
                    onChange={(event) => setLicenseKey(event.target.value.toUpperCase())}
                    placeholder={strings.keyPlaceholder}
                    spellCheck={false}
                    className={`${inputClass} font-mono tracking-wide`}
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{strings.keyHint}</p>

              {message ? (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    message.tone === 'ok'
                      ? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {message.text}
                </p>
              ) : null}

              <button
                type="button"
                disabled={busy || !email.trim() || !licenseKey.trim()}
                onClick={handleActivate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                {busy ? strings.activating : strings.activateButton}
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{strings.whereIsKeyTitle}</p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{strings.whereIsKeyBody}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{strings.requestTitle}</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{strings.requestLead}</p>
              </div>
              <LicenceRequestForm
                isAr={isAr}
                strings={strings}
                initialProduct={state.activation?.itemId ?? 'suite'}
              />
            </div>
          )}

          {/* Device ID and a direct email are always reachable, on both tabs. */}
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <LicenceDeviceId deviceId={state.deviceFingerprint ?? ''} deviceName={state.deviceName} strings={strings} />
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={mailto}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {strings.emailSupport}
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                {strings.supportBody}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
