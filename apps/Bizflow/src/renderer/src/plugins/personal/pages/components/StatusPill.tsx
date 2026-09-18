import type { ReactNode } from 'react'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'info'

const TONE: Record<StatusTone, string> = {
  neutral:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  danger:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  accent:
    'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]',
  info: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
}

/** Maps the badge vocabulary the handlers already speak onto a tone. */
export function statusToneOf(variant: string): StatusTone {
  switch (variant) {
    case 'success':
      return 'success'
    case 'destructive':
      return 'danger'
    case 'default':
      return 'accent'
    case 'secondary':
      return 'neutral'
    default:
      return 'info'
  }
}

interface StatusPillProps {
  tone?: StatusTone
  children: ReactNode
  /** The leading dot carries the state when the label is a long phrase. */
  dot?: boolean
  className?: string
}

/**
 * The one way a state is rendered in this plugin. Replaces `Badge` on rows so a
 * table of statuses stays scannable by colour and by dot, not by fill weight.
 */
export default function StatusPill({
  tone = 'neutral',
  children,
  dot = true,
  className = ''
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  )
}
