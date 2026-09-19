/**
 * Small building blocks for the receipt settings screens.
 *
 * The page used to be one column of `p-6` cards with `text-sm` inputs, which
 * pushed the printer options two screens down and left the live receipt preview
 * nowhere to live. These primitives stay compact so a whole tab fits on screen
 * next to the preview, while keeping text at a comfortable reading size.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Check, CheckCircle2, Info, Loader2 } from 'lucide-react'

export const inputClass =
  'w-full px-3 py-2.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-600 ' +
  'bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 ' +
  'outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-[border-color,box-shadow]'

export const monoInputClass = `${inputClass} font-mono text-start`

export const buttonClass =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold ' +
  'rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

export const primaryButtonClass = `${buttonClass} bg-primary text-white hover:bg-primary/90 shadow-sm`

export const ghostButtonClass = `${buttonClass} border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary/60 hover:text-primary`

export const warningButtonClass = `${buttonClass} border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50`

export const dangerButtonClass = `${buttonClass} border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50`

interface InfoHintProps {
  /** Accessible name of the trigger button, and of the panel when `title` is omitted. */
  label: string
  title?: string
  /** Which edge of the trigger the panel is anchored to. */
  align?: 'start' | 'end'
  children: ReactNode
}

/**
 * Fired on `window` whenever a hint opens, so the others can close themselves.
 */
export const HINT_OPEN_EVENT = 'bizflow:hint-open'

/**
 * Info icon that opens a small help panel on click. Keyboard users get Escape to
 * close, and a click anywhere outside closes it too.
 */
export function InfoHint({ label, title, align = 'end', children }: Readonly<InfoHintProps>) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const hintId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent): void => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onOtherHintOpen = (event: Event): void => {
      if ((event as CustomEvent<string>).detail !== hintId) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener(HINT_OPEN_EVENT, onOtherHintOpen)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(HINT_OPEN_EVENT, onOtherHintOpen)
    }
  }, [open, hintId])

  const toggle = (): void => {
    if (open) {
      setOpen(false)
      return
    }
    window.dispatchEvent(new CustomEvent(HINT_OPEN_EVENT, { detail: hintId }))
    setOpen(true)
  }

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={title ?? label}
          className={`absolute top-full mt-2 z-40 w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-3 text-start shadow-xl shadow-slate-900/10 ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {title ? (
            <p className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">{title}</p>
          ) : null}
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {children}
          </div>
        </div>
      ) : null}
    </span>
  )
}

interface SectionCardProps {
  icon: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function SectionCard({
  icon,
  title,
  subtitle,
  actions,
  children
}: Readonly<SectionCardProps>) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 p-4 space-y-4 shadow-sm shadow-slate-900/[0.02]">
      <header className="flex items-start justify-between gap-3 pb-3 -mb-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white">{title}</h4>
            {subtitle ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-1.5 shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

/** One-line explanation under a control. */
export function HelpText({
  children,
  className = ''
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <p className={`text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  )
}

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function Field({ label, hint, required, children }: Readonly<FieldProps>) {
  return (
    <div className="min-w-0">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1.5">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

interface ChoiceGroupProps<T extends string> {
  label?: string
  value: T
  options: Array<Option<T>>
  onChange: (value: T) => void
  columns?: 2 | 3
}

/** Radio pills: compact, and the selected option is obvious at a glance. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3
}: Readonly<ChoiceGroupProps<T>>) {
  return (
    <div className="min-w-0">
      {label ? (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label}
        </label>
      ) : null}
      <div
        className={`grid gap-2 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`relative text-start px-3 py-2.5 pe-7 rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-primary/50 hover:bg-primary/[0.03]'
              }`}
            >
              <span
                className={`block text-xs font-semibold ${
                  selected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {option.label}
              </span>
              {option.description ? (
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {option.description}
                </span>
              ) : null}
              {selected ? (
                <Check className="w-3.5 h-3.5 text-primary absolute top-2.5 end-2.5" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: ReactNode
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
  icon
}: Readonly<SwitchRowProps>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-start outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
    >
      <span className="flex items-start gap-2 min-w-0">
        {icon ? <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span> : null}
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </span>
          {description ? (
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </span>
          ) : null}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display: string
  onChange: (value: number) => void
  hint?: string
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
  hint
}: Readonly<RangeFieldProps>) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 accent-primary cursor-pointer"
      />
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {hint ? <HelpText className="mt-1.5">{hint}</HelpText> : null}
    </div>
  )
}

export type NoticeTone = 'success' | 'error' | 'info' | 'warning'

const NOTICE_TONES: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  success: {
    box: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
  },
  error: {
    box: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300',
    icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
  },
  warning: {
    box: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300',
    icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
  },
  info: {
    box: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300',
    icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-px" />
  }
}

interface NoticeProps {
  tone: NoticeTone
  children: ReactNode
  actions?: ReactNode
}

export function Notice({ tone, children, actions }: Readonly<NoticeProps>) {
  return (
    <div
      className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs leading-relaxed ${NOTICE_TONES[tone].box}`}
    >
      {NOTICE_TONES[tone].icon}
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex items-center gap-1.5 shrink-0">{actions}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate'
}: Readonly<{ children: ReactNode; tone?: 'slate' | 'primary' | 'success' | 'warning' }>) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Spinner({ label }: Readonly<{ label: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      <span>{label}</span>
    </span>
  )
}
