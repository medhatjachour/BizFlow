/**
 * The HR module's design-system primitives.
 *
 * Every card in HR was re-declaring the same shell
 * (`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm`),
 * every badge was re-picking its own colour pair, and every empty state was a
 * centred `<p>`. The result drifted: two badges meaning the same thing looked
 * different, and a "no data" screen gave no way out. These live here so a change
 * to the module's look is one edit.
 *
 * Deliberately small. These are not a general-purpose UI kit — they are the
 * vocabulary this module needs, matching the tokens already in use.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/* ------------------------------------------------------------------ card -- */

export function HrCard({
  children,
  className = '',
  padded = true,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  padded?: boolean
  as?: 'div' | 'section' | 'li'
}) {
  return (
    <Tag
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${
        padded ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

export function HrSectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className = '',
}: {
  icon?: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- button -- */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'successOutline'
  | 'dangerOutline'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
  secondary:
    'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50',
  ghost: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
  warning: 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm',
  successOutline:
    'border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
  dangerOutline:
    'border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
}

const BUTTON_SIZES = {
  xs: 'px-2 py-1 text-xs rounded-md gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-1.5',
}

export function HrButton({
  children,
  onClick,
  variant = 'secondary',
  size = 'sm',
  icon: Icon,
  loading = false,
  disabled = false,
  title,
  type = 'button',
  className = '',
}: {
  children?: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: keyof typeof BUTTON_SIZES
  icon?: LucideIcon
  loading?: boolean
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {Icon && <Icon size={size === 'xs' ? 12 : 15} className={loading ? 'animate-spin' : undefined} />}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------- badge -- */

export type HrTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const TONES: Record<HrTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  brand: 'bg-primary/10 text-primary dark:bg-primary/20',
}

export function HrBadge({
  children,
  tone = 'neutral',
  icon: Icon,
  className = '',
}: {
  children: ReactNode
  tone?: HrTone
  icon?: LucideIcon
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </span>
  )
}

/** Employee lifecycle status → one consistent badge everywhere. */
export function HrStatusBadge({ status, label }: { status: string; label?: string }) {
  const tone: HrTone =
    status === 'active' ? 'success' : status === 'on-leave' ? 'warning' : status === 'terminated' ? 'danger' : 'neutral'
  return <HrBadge tone={tone}>{label ?? status}</HrBadge>
}

/** Marks data deliberately withheld from the current user, rather than missing. */
export function HrRestricted({ label, hint }: { label: string; hint?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs italic text-slate-400 dark:text-slate-500"
      title={hint}
    >
      {label}
    </span>
  )
}

/* ---------------------------------------------------------------- table -- */

export interface HrColumn {
  label: ReactNode
  /** Numeric columns read better end-aligned, which also survives RTL. */
  align?: 'start' | 'center' | 'end'
  className?: string
}

/**
 * The table shell every HR tab was rebuilding by hand — same border, same
 * `uppercase` header, same row dividers. Column headers were also being passed
 * as a plain string array, which is why some tables ended up with a trailing
 * empty header for the actions column. `align` uses logical values so the
 * numbers stay on the correct side in Arabic.
 */
export function HrTableShell({
  columns,
  children,
  className = '',
}: {
  columns: HrColumn[]
  children: ReactNode
  className?: string
}) {
  const alignClass = (align?: HrColumn['align']) =>
    align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase ${alignClass(
                  col.align
                )} ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{children}</tbody>
      </table>
    </div>
  )
}

/** Row-level icon action. Was hand-rolled in every tab with slightly different hover tones. */
export function HrIconButton({
  icon: Icon,
  onClick,
  title,
  tone = 'neutral',
  size = 14,
}: {
  icon: LucideIcon
  onClick: () => void
  title: string
  tone?: 'neutral' | 'success' | 'danger' | 'warning'
  size?: number
}) {
  const hover =
    tone === 'success'
      ? 'hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
      : tone === 'danger'
        ? 'hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
        : tone === 'warning'
          ? 'hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
          : 'hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700/50'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded text-slate-400 transition-colors ${hover}`}
    >
      <Icon size={size} />
    </button>
  )
}

/** One tone vocabulary for request/approval status, shared by leave and overtime. */
export function hrRequestStatusTone(status: string): HrTone {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
}

/* ------------------------------------------------------------------ stat -- */

export function HrStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
  valueClassName,
  className = '',
}: {
  icon?: LucideIcon
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: HrTone
  /** Override the value colour when the colour itself carries meaning (e.g. red for absences). */
  valueClassName?: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`w-6 h-6 rounded-md flex items-center justify-center ${TONES[tone]}`}>
            <Icon size={13} />
          </span>
        )}
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className={`text-xl font-bold mt-1.5 ${valueClassName ?? 'text-slate-900 dark:text-white'}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
    </div>
  )
}

export function HrProgress({
  value,
  max = 100,
  tone = 'brand',
  label,
}: {
  value: number
  max?: number
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  label?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const bar =
    tone === 'success' ? 'bg-green-500' : tone === 'warning' ? 'bg-amber-500' : tone === 'danger' ? 'bg-red-500' : 'bg-primary'
  return (
    <div
      className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ----------------------------------------------------------- empty state -- */

/**
 * An empty state that offers a way out. The module previously rendered bare
 * `<p>No records</p>` in several places, which tells the user nothing about
 * whether the data is missing, filtered, or theirs to create.
 */
export function HrEmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className = '',
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'danger'
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-6 ${className}`}>
      {Icon && (
        <span
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
            tone === 'danger' ? TONES.danger : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
          }`}
        >
          <Icon size={22} />
        </span>
      )}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ----------------------------------------------------------------- field -- */

/**
 * Cancel / submit pair for a modal footer.
 *
 * Every modal in the module had hand-written buttons here, and the submit ones
 * used a global `btn-primary` class rather than `HrButton` — so they had no
 * loading state and did not match the buttons everywhere else on the page.
 */
export function HrModalActions({
  onCancel,
  onSubmit,
  cancelLabel,
  submitLabel,
  submitIcon,
  submitting = false,
  submitDisabled = false,
  submitVariant = 'primary',
}: {
  onCancel: () => void
  onSubmit: () => void
  cancelLabel: ReactNode
  submitLabel: ReactNode
  submitIcon?: LucideIcon
  submitting?: boolean
  submitDisabled?: boolean
  submitVariant?: ButtonVariant
}) {
  return (
    <div className="flex justify-end gap-3 pt-1 border-t border-slate-200 dark:border-slate-700">
      <HrButton onClick={onCancel} variant="secondary" size="md">
        {cancelLabel}
      </HrButton>
      <HrButton
        onClick={onSubmit}
        variant={submitVariant}
        size="md"
        icon={submitIcon}
        loading={submitting}
        disabled={submitDisabled}
      >
        {submitLabel}
      </HrButton>
    </div>
  )
}

/** Label + control + hint/error, so every HR form aligns its labels the same way. */
export function HrField({
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{error}</span>
      ) : (
        hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>
      )}
    </label>
  )
}

export const HR_INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary'

export const HR_SELECT_CLASS = `${HR_INPUT_CLASS} cursor-pointer`

export const HR_TEXTAREA_CLASS = `${HR_INPUT_CLASS} resize-none`

/**
 * A labelled divider between groups of form fields.
 *
 * Every HR form had its own version of this — some with a `pt-1`, some without,
 * some with a `tracking-widest` label, some with a heavier rule — so no two forms
 * lined up. This is the one definition.
 */
export function HrFormSection({
  title,
  children,
  className = '',
}: {
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`sm:col-span-2 space-y-4 ${className}`}>
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>
      {children}
    </div>
  )
}
