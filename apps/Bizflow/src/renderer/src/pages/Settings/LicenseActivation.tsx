/**
 * Licence panel — Settings → General.
 *
 * The app runs on a 14-day free trial from first launch, then requires an
 * activation key. Once activated the licence is bound to this one device and
 * revalidates online every 30 days, with a 14-day grace window before the app
 * locks.
 *
 * This panel is the honest picture of that: what the licence covers, where it is
 * activated, when it was last checked — plus the two actions an owner actually
 * needs, revalidate now and ask us to move the licence to another computer.
 */

import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, KeyRound, LifeBuoy, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'

import { useLanguage } from '../../contexts/LanguageContext'
import { useEnabledModules } from '../../hooks/useModuleEnabled'
import { formatDate } from '../../lib/format'
import { SUPPORT_EMAIL } from '../../components/help/support'
import type { ModuleId } from '../../../../shared/modules'
import LicenceDeviceId from '../../components/license/LicenceDeviceId'
import LicenceOwnerPanel from '../../components/license/LicenceOwnerPanel'
import LicenceRequestForm from '../../components/license/LicenceRequestForm'
import { licenseStrings, statusLabel, type LicenseTone } from '../../components/license/licenseStrings'

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
  clockTampered?: boolean
  trialDaysLeft?: number
  daysUntilExpiry?: number
  graceDaysLeft?: number
  nextRevalidationAt?: string | null
  revalidationDue?: boolean
  deviceFingerprint: string
  deviceName: string
  activation?: ActivationInfo
}

const STATUS_STYLES: Record<LicenseStatus, { badge: string; icon: 'ok' | 'warn' | 'bad' }> = {
  trial: { badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', icon: 'warn' },
  active: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: 'ok' },
  grace: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: 'warn' },
  expired: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', icon: 'bad' },
  trial_expired: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', icon: 'bad' },
}


export default function LicenseActivation() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const strings = licenseStrings(isAr)
  const enabledModules = useEnabledModules() as ModuleId[]

  const [state, setState] = useState<LicenseState | null>(null)
  const [email, setEmail] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [requesting, setRequesting] = useState(false)
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

  /**
   * Remember the address the licence was bought with.
   *
   * The server matches on email + key, so a mistyped address is the most common
   * failed activation — and the one thing a customer moving a licence should
   * never have to reproduce from memory. Only fills an empty field, so typing is
   * never overwritten.
   */
  const activationEmail = state?.activation?.email ?? ''
  useEffect(() => {
    if (!activationEmail) return
    setEmail((current) => current || activationEmail)
  }, [activationEmail])

  async function handleActivate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.api.license.activateOnline(email.trim(), licenseKey.trim().toUpperCase())
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error ?? strings.activateFailed })
        return
      }
      await refresh()
      setMessage({ kind: 'ok', text: strings.activateSuccess })
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
      // `valid` alone is not the whole answer: when the request never left the
      // machine (offline) the main process deliberately keeps the licence and
      // reports `checked: false`. Claiming success there told offline customers
      // their licence had been confirmed when nothing had happened.
      setMessage(
        !result.checked
          ? { kind: 'error', text: strings.revalidateOffline }
          : result.valid
            ? { kind: 'ok', text: strings.revalidateOk }
            : { kind: 'error', text: strings.revalidateFailed }
      )
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const status: LicenseStatus = state?.status ?? 'trial'
  const style = STATUS_STYLES[status]
  const needsActivation = status === 'trial_expired' || status === 'expired'
  const activation = state?.activation

  // Dates follow the active language, the same way every HR screen formats
  // them. `toLocaleDateString('ar')` used to decide on its own and emitted
  // bidi marks that leaked into the copied text.
  const dateLabel = (iso: string | undefined): string => {
    if (!iso) return strings.never
    return formatDate(iso, language)
  }

  const nextCheck = state?.nextRevalidationAt ? formatDate(state.nextRevalidationAt, language) : null

  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    strings.supportSubject
  )}&body=${encodeURIComponent(
    strings.supportMailBody({
      key: activation?.licenseKey ?? '—',
      device: state?.deviceName ?? '',
      deviceId: state?.deviceFingerprint ?? '',
    })
  )}`

  const detailRow = (label: string, value: React.ReactNode) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <KeyRound className="h-5 w-5" />
          {strings.panelTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{strings.panelLead}</p>
      </div>

      {/* ── Status ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {style.icon === 'ok' ? (
              <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            ) : style.icon === 'warn' ? (
              <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-500" aria-hidden="true" />
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
              {statusLabel(strings, status as LicenseTone)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleRevalidate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? strings.revalidating : strings.revalidate}
            </button>
            <a
              href={supportMailto}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              {strings.emailSupport}
            </a>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {status === 'trial' && state?.trialDaysLeft != null ? strings.trialDaysLeft(state.trialDaysLeft) : null}
          {status === 'trial_expired' ? strings.gateLead : null}
          {status === 'active'
            ? state?.revalidationDue
              ? strings.revalidationDueNow
              : state?.daysUntilExpiry != null
                ? strings.daysUntilExpiry(state.daysUntilExpiry)
                : null
            : null}
          {status === 'grace' && state?.graceDaysLeft != null ? strings.graceDaysLeft(state.graceDaysLeft) : null}
          {status === 'expired' ? strings.gateLead : null}
        </p>

        {/* The schedule, spelled out. "In 30 days" is a moving target for a
            rolling window, so the actual date is the honest answer — and the
            note keeps anyone from hunting for a renewal button that does not
            need to exist. */}
        {status === 'active' && nextCheck ? (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {strings.nextCheckOn(nextCheck)} {strings.autoCheckNote}
          </p>
        ) : null}

        {state?.clockTampered ? (
          <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            {strings.clockWarning}
          </p>
        ) : null}

        {message ? (
          <p
            className={`mt-3 text-sm font-medium ${
              message.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message.text}
          </p>
        ) : null}

        {activation ? (
          <dl className="mt-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
            {detailRow(
              strings.keyRow,
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <span className="font-mono text-xs">{activation.licenseKey}</span>
              </span>
            )}
            {detailRow(strings.licensedToRow, activation.email)}
            {detailRow(strings.issuedRow, dateLabel(activation.issuedAt))}
            {detailRow(strings.expiresRow, dateLabel(activation.expiresAt))}
            {detailRow(strings.lastCheckedRow, dateLabel(activation.lastValidatedAt))}
            {nextCheck ? detailRow(strings.nextCheckRow, nextCheck) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{strings.notActivated}</p>
        )}

        <div className="mt-3">
          <LicenceDeviceId
            deviceId={state?.deviceFingerprint ?? ''}
            deviceName={state?.deviceName}
            strings={strings}
          />
        </div>
      </div>

      {/* ── Activate / request ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {needsActivation ? strings.activateHeading : strings.changeLicence}
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{strings.activateLead}</p>
          </div>
          {!needsActivation ? (
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {strings.tabRequest}
            </button>
          ) : null}
        </div>

        {/* Labelled, not placeholder-only: the placeholder disappears the moment
            anyone types, and the key field especially needs to stay identifiable
            when it is already filled with a 29-character value. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {strings.emailLabel}
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={strings.emailPlaceholder}
              autoComplete="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {strings.keyLabel}
            </span>
            <input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder={strings.keyPlaceholder}
              spellCheck={false}
              dir="ltr"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy || !email.trim() || !licenseKey.trim()}
          onClick={handleActivate}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? strings.activating : strings.activateButton}
        </button>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{strings.keyHint}</p>

        {needsActivation || requesting ? (
          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{strings.requestTitle}</p>
            <p className="mt-0.5 mb-3 text-sm text-slate-500 dark:text-slate-400">{strings.requestLead}</p>
            <LicenceRequestForm
              isAr={isAr}
              strings={strings}
              initialProduct={activation?.itemId ?? 'suite'}
            />
          </div>
        ) : null}
      </div>

      {/* ── Owner panel ──────────────────────────────────────────────────── */}
      <LicenceOwnerPanel
        isAr={isAr}
        strings={strings}
        enabledModules={enabledModules}
        state={{
          itemId: activation?.itemId,
          email: activation?.email,
          deviceName: state?.deviceName ?? '',
          deviceFingerprint: state?.deviceFingerprint ?? '',
        }}
      />
    </div>
  )
}
