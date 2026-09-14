/**
 * HelpCentre
 *
 * A floating help button plus a slide-over panel containing the full user
 * guide, and the first-run guided tour.
 *
 * Everything is local: no network calls, no telemetry. The only dynamic value is
 * the Device ID, read from the licence bridge, which the contact section copies
 * to the clipboard so a user can paste it into an email without hunting for it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  Copy,
  Database,
  HelpCircle,
  Info,
  KeyRound,
  Keyboard,
  LifeBuoy,
  Lightbulb,
  Mail,
  Rocket,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import {
  HELP_SECTIONS,
  HELP_TOUR_STEPS,
  SUPPORT_EMAIL,
  type HelpBlock,
  type HelpIcon,
  type HelpSection,
} from './help/helpContent'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'

const TOUR_SEEN_KEY = 'bizflow:helpTourSeen'

const SECTION_ICONS: Record<HelpIcon, typeof Rocket> = {
  rocket: Rocket,
  book: BookOpen,
  key: KeyRound,
  lifebuoy: LifeBuoy,
  wrench: Wrench,
  database: Database,
  keyboard: Keyboard,
}

/** Flatten a section into searchable text. */
function sectionText(section: HelpSection): string {
  const parts: string[] = [section.title, section.summary, ...section.keywords]
  for (const block of section.blocks) {
    if (block.kind === 'text') parts.push(block.text)
    if (block.kind === 'steps') {
      if (block.title) parts.push(block.title)
      for (const s of block.steps) parts.push(s.title, s.text)
    }
    if (block.kind === 'list') {
      if (block.title) parts.push(block.title)
      parts.push(...block.items)
    }
    if (block.kind === 'callout') {
      if (block.title) parts.push(block.title)
      parts.push(block.text)
    }
    if (block.kind === 'keys') {
      if (block.title) parts.push(block.title)
      for (const k of block.keys) parts.push(k.combo, k.text)
    }
    if (block.kind === 'contact') parts.push('contact support device id email')
  }
  return parts.join(' ').toLowerCase()
}

function CalloutIcon({ tone }: { tone: 'info' | 'tip' | 'warning' }) {
  if (tone === 'warning') return <AlertTriangle className="h-4 w-4" aria-hidden="true" />
  if (tone === 'tip') return <Lightbulb className="h-4 w-4" aria-hidden="true" />
  return <Info className="h-4 w-4" aria-hidden="true" />
}

const CALLOUT_STYLES: Record<'info' | 'tip' | 'warning', string> = {
  info: 'border-sky-300/60 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-100',
  tip: 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100',
  warning:
    'border-rose-300/60 bg-rose-50 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-100',
}

export default function HelpCentre() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [copied, setCopied] = useState(false)
  const [tourStep, setTourStep] = useState<number | null>(null)

  const closeRef = useRef<HTMLButtonElement | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Device ID (used by the contact block) --------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await window.api?.license?.getDeviceFingerprint?.()
        if (!cancelled && res?.deviceFingerprint) setDeviceId(res.deviceFingerprint)
      } catch {
        // No bridge (web build) — the contact block hides the ID.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- First run: show the tour once ---------------------------------------
  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_SEEN_KEY) !== '1') setTourStep(0)
    } catch {
      // Storage unavailable — better to skip the tour than to loop it forever.
    }
  }, [])

  const dismissTour = useCallback(() => {
    setTourStep(null)
    try {
      localStorage.setItem(TOUR_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const openHelp = useCallback(() => {
    setOpen(true)
    setActiveSection(null)
    setQuery('')
  }, [])

  // The command palette lives in a different subtree, so it asks for the panel
  // through an event rather than through props.
  useEffect(() => {
    window.addEventListener('bizflow:help:open', openHelp)
    return () => window.removeEventListener('bizflow:help:open', openHelp)
  }, [openHelp])

  // Focus the close button when the panel opens, and restore focus after.
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSection) setActiveSection(null)
        else setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, activeSection])

  const copyDeviceId = useCallback(async () => {
    if (!deviceId) return
    try {
      await navigator.clipboard.writeText(deviceId)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = deviceId
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }, [deviceId])

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    []
  )

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HELP_SECTIONS
    return HELP_SECTIONS.filter((s) => sectionText(s).includes(q))
  }, [query])

  const current = useMemo(
    () => HELP_SECTIONS.find((s) => s.id === activeSection) ?? null,
    [activeSection]
  )

  const supportMailto = useMemo(() => {
    const body = [
      'Hello,',
      '',
      'I need help with BizFlow.',
      '',
      'What happened:',
      '',
      'What I expected:',
      '',
      `Device ID: ${deviceId || '(unavailable)'}`,
    ].join('\n')
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      'BizFlow support request'
    )}&body=${encodeURIComponent(body)}`
  }, [deviceId])

  const renderBlock = (block: HelpBlock, i: number) => {
    switch (block.kind) {
      case 'text':
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {block.text}
          </p>
        )

      case 'steps':
        return (
          <div key={i} className="space-y-3">
            {block.title ? (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {block.title}
              </h3>
            ) : null}
            <ol className="space-y-3">
              {block.steps.map((step, si) => (
                <li key={si} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {si + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )

      case 'list':
        return (
          <div key={i} className="space-y-2">
            {block.title ? (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {block.title}
              </h3>
            ) : null}
            <ul className="space-y-1.5">
              {block.items.map((item, li) => (
                <li
                  key={li}
                  className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )

      case 'callout':
        return (
          <div
            key={i}
            className={`rounded-xl border p-3.5 ${CALLOUT_STYLES[block.tone]}`}
          >
            <div className="flex gap-2.5">
              <span className="mt-0.5 shrink-0">
                <CalloutIcon tone={block.tone} />
              </span>
              <div className="min-w-0">
                {block.title ? (
                  <p className="text-sm font-semibold">{block.title}</p>
                ) : null}
                <p className="mt-0.5 text-sm leading-relaxed opacity-90">{block.text}</p>
              </div>
            </div>
          </div>
        )

      case 'keys':
        return (
          <div key={i} className="space-y-2">
            {block.title ? (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {block.title}
              </h3>
            ) : null}
            <dl className="divide-y divide-slate-200 dark:divide-slate-800">
              {block.keys.map((k, ki) => (
                <div key={ki} className="flex items-start gap-3 py-2">
                  <dt className="w-32 shrink-0">
                    <kbd className="inline-block rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {k.combo}
                    </kbd>
                  </dt>
                  <dd className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {k.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )

      case 'contact':
        return (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Email us
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Include your Device ID and we can sort activation and licence moves in one
              reply.
            </p>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Your Device ID
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {deviceId || 'Not available in this build'}
              </p>
              <button
                type="button"
                onClick={copyDeviceId}
                disabled={!deviceId}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy Device ID'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={supportMailto}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email support
              </a>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {SUPPORT_EMAIL}
              </span>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {/* ---- Floating launcher -------------------------------------------- */}
      {/* One column so the two buttons can never drift into each other.
          Logical inset utilities (end-*) keep it on the right in English and
          move it to the left in Arabic, where the document is RTL. */}
      <div className="fixed end-6 bottom-6 z-40 flex flex-col items-end gap-3">
        <KeyboardShortcutsHelp />

        <button
          type="button"
          data-tour="help-button"
          onClick={openHelp}
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          aria-label="Open help and user guide"
          title="Help and user guide"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[8rem]">
            Help
          </span>
        </button>
      </div>

      {/* ---- Slide-over panel --------------------------------------------- */}
      {open ? (
        <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Help and user guide">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="presentation"
          />

          <div className="absolute inset-y-0 end-0 flex w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              {current ? (
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Back to all help topics"
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                </button>
              ) : (
                <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              )}

              <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900 dark:text-white">
                {current ? current.title : 'Help and user guide'}
              </h2>

              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Close help"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {current ? (
                <div className="space-y-5 px-5 py-5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {current.summary}
                  </p>
                  {current.blocks.map(renderBlock)}
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(null)
                        setQuery('')
                      }}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Back to all topics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-5">
                  <label className="relative block">
                    <span className="sr-only">Search help</span>
                    <Search
                      className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search help — try printer, licence, backup…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </label>

                  <div className="mt-4 space-y-2">
                    {sections.map((section) => {
                      const Icon = SECTION_ICONS[section.icon]
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                          className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-primary/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              {section.title}
                            </span>
                            <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                              {section.summary}
                            </span>
                          </span>
                        </button>
                      )
                    })}

                    {sections.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                        Nothing matched that. You can email us at{' '}
                        <span className="font-medium">{SUPPORT_EMAIL}</span> — open{' '}
                        <button
                          type="button"
                          className="font-semibold text-primary underline"
                          onClick={() => setActiveSection('support')}
                        >
                          Contact support
                        </button>{' '}
                        for your Device ID.
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setTourStep(0)
                    }}
                    className="mt-5 text-sm font-semibold text-primary hover:underline"
                  >
                    Replay the guided tour
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- First-run guided tour ---------------------------------------- */}
      {tourStep !== null ? (
        <HelpTour step={tourStep} onStep={setTourStep} onDone={dismissTour} />
      ) : null}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Guided tour                                                                 */
/* -------------------------------------------------------------------------- */

function HelpTour({
  step,
  onStep,
  onDone,
}: {
  step: number
  onStep: (n: number) => void
  onDone: () => void
}) {
  const current = HELP_TOUR_STEPS[step]
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Measure the anchor on each step, and keep it correct through resize/scroll.
  useEffect(() => {
    if (!current?.anchor) {
      setRect(null)
      return
    }

    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.anchor}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [current?.anchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      if (e.key === 'ArrowRight') onStep(Math.min(step + 1, HELP_TOUR_STEPS.length - 1))
      if (e.key === 'ArrowLeft') onStep(Math.max(step - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, onStep, onDone])

  if (!current) return null

  const last = step === HELP_TOUR_STEPS.length - 1
  const pad = 6

  // Tooltip placement. Everything is clamped so it can never leave the viewport.
  let tipStyle: React.CSSProperties
  if (rect) {
    const width = 340
    const placement = current.placement ?? 'bottom'
    let top = rect.bottom + 12
    let left = rect.left

    if (placement === 'right') {
      left = rect.right + 12
      top = rect.top
    } else if (placement === 'left') {
      left = rect.left - width - 12
      top = rect.top
    } else if (placement === 'top') {
      top = rect.top - 12
    }

    if (placement === 'top') {
      tipStyle = {
        width,
        left: Math.min(Math.max(12, left), window.innerWidth - width - 12),
        bottom: window.innerHeight - top,
      }
    } else {
      tipStyle = {
        width,
        left: Math.min(Math.max(12, left), window.innerWidth - width - 12),
        top: Math.min(Math.max(12, top), window.innerHeight - 220),
      }
    }
  } else {
    tipStyle = { width: 380, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop. When we have an anchor, the spotlight punches a hole in it. */}
      {rect ? (
        <div
          className="absolute rounded-xl ring-2 ring-white/80 transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.7)',
          }}
          onClick={onDone}
          role="presentation"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/70" onClick={onDone} role="presentation" />
      )}

      <div
        className="absolute rounded-2xl border border-slate-700 bg-white p-5 shadow-2xl dark:bg-slate-900"
        style={tipStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${step + 1} of ${HELP_TOUR_STEPS.length}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Step {step + 1} of {HELP_TOUR_STEPS.length}
          </p>
          <button
            type="button"
            onClick={onDone}
            className="-mt-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Skip the tour"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
          {current.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {current.text}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {HELP_TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => onStep(step - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (last ? onDone() : onStep(step + 1))}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {last ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
