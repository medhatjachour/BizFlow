/**
 * LicenseActivation
 *
 * Device license activation panel, shown in the **General** settings tab.
 *
 * The app runs on a 14-day free trial from first launch, then requires an
 * activation key. Once activated, the license is bound to this one device and
 * revalidates online every 30 days. If a revalidation is missed there is a
 * 14-day grace window (with a warning) before the app is locked.
 */

import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, KeyRound, Mail, ShieldAlert, ShieldCheck } from 'lucide-react'

type LicenseStatus = 'trial' | 'active' | 'grace' | 'expired' | 'trial_expired'

interface ActivationInfo {
  email: string
  licenseKey: string
  itemId: string
  deviceFingerprint: string
  deviceName: string
  issuedAt: string
  expiresAt: string
  lastValidatedAt: string
}

interface LicenseState {
  status: LicenseStatus
  activated: boolean
  locked?: boolean
  trialDaysLeft?: number
  daysUntilExpiry?: number
  graceDaysLeft?: number
  deviceFingerprint: string
  deviceName: string
  activation?: ActivationInfo
}

/**
 * Support inbox for activation requests. Must be a mailbox that actually
 * receives mail - the previous branded address had no MX record and bounced.
 */
const SUPPORT_EMAIL = 'medhatjachour8@gmail.com'

const STATUS_STYLES: Record<LicenseStatus, { badge: string; label: string }> = {
  trial: { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', label: 'Free trial' },
  active: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Activated' },
  grace: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Revalidation due' },
  expired: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', label: 'Expired' },
  trial_expired: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', label: 'Trial ended' }
}

export default function LicenseActivation() {
  const [state, setState] = useState<LicenseState | null>(null)
  const [email, setEmail] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function refresh() {
    try {
      const next = await window.api.license.getState()
      setState(next as LicenseState)
    } catch {
      setState(null)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleActivate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.license.activateOnline(email.trim(), licenseKey.trim().toUpperCase())
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error ?? 'Activation failed' })
        return
      }
      await refresh()
      setMessage({ kind: 'ok', text: 'License activated for this device.' })
      setLicenseKey('')
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function handleRevalidate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.license.validateOnline()
      await refresh()
      if (result.valid) setMessage({ kind: 'ok', text: 'License revalidated successfully.' })
      else setMessage({ kind: 'error', text: 'Revalidation failed. Please contact support.' })
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const status: LicenseStatus = state?.status ?? 'trial'
  const style = STATUS_STYLES[status]
  const needsActivation = status === 'trial_expired' || status === 'expired'

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <KeyRound className="h-5 w-5" />
        License activation
      </h3>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        {/* Status row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {status === 'active' ? (
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            ) : status === 'grace' || status === 'trial' ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
              {style.label}
            </span>
          </div>
          {state?.deviceFingerprint ? (
            <span className="font-mono text-[11px] text-slate-400">
              Device: {state.deviceFingerprint.slice(0, 16)}…
            </span>
          ) : null}
        </div>

        {/* Contextual message */}
        {status === 'trial' && state?.trialDaysLeft != null ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            You have <strong>{state.trialDaysLeft}</strong> day{state.trialDaysLeft === 1 ? '' : 's'} left in
            your free trial. Activate any time to keep using BizFlow without interruption.
          </p>
        ) : null}

        {status === 'trial_expired' ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your 14-day trial has ended. Enter your license key below to activate this device, or
            email us to get one.
          </p>
        ) : null}

        {status === 'active' && state?.daysUntilExpiry != null ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This device is activated. Next revalidation due in{' '}
            <strong>{state.daysUntilExpiry}</strong> day{state.daysUntilExpiry === 1 ? '' : 's'}.
          </p>
        ) : null}

        {status === 'grace' && state?.graceDaysLeft != null ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Revalidation is overdue.</strong> Please connect to the internet — the license will
            stop working in <strong>{state.graceDaysLeft}</strong> day
            {state.graceDaysLeft === 1 ? '' : 's'} unless it is revalidated.
          </p>
        ) : null}

        {status === 'expired' ? (
          <p className="text-sm text-rose-700 dark:text-rose-300">
            This license is no longer valid on this device. Reactivate with your key, or contact{' '}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        ) : null}

        {/* Active license details */}
        {state?.activation ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
            <p className="flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-mono">{state.activation.licenseKey}</span>
              <span className="opacity-60">({state.activation.itemId})</span>
            </p>
            <p className="mt-1 opacity-70">
              Licensed to {state.activation.email} · {state.activation.deviceName}
            </p>
          </div>
        ) : null}

        {/* Activation form */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Purchase email"
            autoComplete="email"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            placeholder="License key (BIZ-XXXXX-…)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            disabled={busy || !email.trim() || !licenseKey.trim()}
            onClick={handleActivate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {busy ? 'Working…' : 'Activate this device'}
          </button>

          {state?.activation ? (
            <button
              disabled={busy}
              onClick={handleRevalidate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              Check now
            </button>
          ) : null}

          {needsActivation ? (
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('BizFlow license request')}&body=${encodeURIComponent(
                `Hello, I would like a license for BizFlow.\n\nDevice: ${state?.deviceName ?? ''}\nDevice ID: ${state?.deviceFingerprint ?? ''}`
              )}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              <Mail className="h-4 w-4" />
              Request a license
            </a>
          ) : null}
        </div>

        {message ? (
          <p
            className={`mt-2 text-xs font-medium ${
              message.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          A license is bound to this one device. After activation BizFlow works offline and checks in
          with the license server every 30 days (with a 14-day grace window).
        </p>
      </div>
    </div>
  )
}
