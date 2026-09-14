/**
 * Licence request form.
 *
 * Shown on the activation gate (when a trial ends) and inside Settings →
 * Licence. Both places are the same job, so they share one form rather than
 * drifting apart.
 *
 * The submit goes through the main process (`license:requestLicense`), which
 * attaches this device's real fingerprint and platform, so we can mint a key
 * that activates here without a second round of "which computer are you on?".
 */

import { useState } from 'react'
import { BadgeCheck, Loader2, Send } from 'lucide-react'

import { MODULE_REGISTRY, MODULE_IDS } from '../../../../shared/modules'
import { moduleNameAr, type LicenseStrings } from './licenseStrings'

interface Props {
  isAr: boolean
  strings: LicenseStrings
  /** Pre-fills the message, e.g. when asking to move a licence. */
  initialMessage?: string
  initialProduct?: string
  /** Rendered under the submit button — usually the support fallback. */
  footer?: React.ReactNode
}

const PRODUCTS = [
  { id: 'suite', en: 'BizFlow — full suite', ar: 'BizFlow — الباقة الكاملة' },
  ...Object.values(MODULE_IDS).map((id) => ({
    id: `module:${id}`,
    en: `${MODULE_REGISTRY[id].name} module`,
    ar: `وحدة ${moduleNameAr(id, MODULE_REGISTRY[id].name)}`,
  })),
]

export default function LicenceRequestForm({
  isAr,
  strings,
  initialMessage = '',
  initialProduct = 'suite',
  footer,
}: Props) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [business, setBusiness] = useState('')
  const [phone, setPhone] = useState('')
  const [product, setProduct] = useState(initialProduct)
  const [seats, setSeats] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white'
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const api = window.api?.license?.requestLicense
      if (!api) throw new Error(strings.requestDisputeNote)

      const result = await api({
        email: email.trim(),
        fullName: fullName.trim(),
        business: business.trim(),
        phone: phone.trim(),
        itemId: product,
        seats: seats.trim(),
        message: message.trim(),
      })

      if (!result?.ok) throw new Error(result?.error ?? strings.activateFailed)
      setReference(result.ref ?? '')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (reference !== null) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 p-4 dark:border-emerald-700/60 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {strings.requestSuccessTitle}
          </p>
          <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-300/90">
            {strings.requestSuccessLead}
          </p>
          {reference ? (
            <div className="mt-3 rounded-lg border border-emerald-300/60 bg-white/70 px-3 py-2 dark:border-emerald-700/50 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                {strings.requestReference}
              </p>
              <p className="mt-0.5 font-mono text-sm text-emerald-900 dark:text-emerald-100">{reference}</p>
            </div>
          ) : null}
        </div>

        <ol className="space-y-2">
          {strings.requestNextSteps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => {
            setReference(null)
            setMessage('')
          }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {strings.requestAnother}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{strings.emailLabel}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={strings.emailPlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{strings.fullNameLabel}</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={strings.fullNamePlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{strings.businessLabel}</span>
          <input
            type="text"
            value={business}
            onChange={(event) => setBusiness(event.target.value)}
            placeholder={strings.businessPlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{strings.phoneLabel}</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={strings.phonePlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{strings.productLabel}</span>
          <select value={product} onChange={(event) => setProduct(event.target.value)} className={inputClass}>
            {PRODUCTS.map((option) => (
              <option key={option.id} value={option.id}>
                {isAr ? option.ar : option.en}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>{strings.seatsLabel}</span>
          <input
            type="text"
            inputMode="numeric"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            placeholder={strings.seatsPlaceholder}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>{strings.messageLabel}</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          placeholder={strings.messagePlaceholder}
          className={`${inputClass} resize-none`}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? strings.requesting : strings.requestSubmit}
      </button>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{strings.requestDisputeNote}</p>

      {footer}
    </form>
  )
}
