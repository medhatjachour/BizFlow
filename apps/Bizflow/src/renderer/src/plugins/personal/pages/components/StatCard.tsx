import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'accent'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  /** Optional second line under the label: a delta, a rank, a due date. */
  delta?: ReactNode
  icon?: ReactNode
  tone?: StatTone
  /** Set when the metric drills into a tab; the tile then reads as a link. */
  onClick?: () => void
  className?: string
}

const TONE_CLASSES: Record<StatTone, string> = {
  default: 'text-slate-900 dark:text-white',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  accent: 'text-[color:var(--accent-text)]'
}

/** Only the states that need acting on get an edge, so the strip stays quiet. */
const TONE_EDGE: Record<StatTone, string> = {
  default: '',
  accent: '',
  success: '',
  warning: 'border-s-2 border-s-amber-400 dark:border-s-amber-500',
  danger: 'border-s-2 border-s-rose-400 dark:border-s-rose-500'
}

/** One figure in a KPI strip. Clickable when the metric drills into a filter. */
export default function StatCard({
  label,
  value,
  sub,
  delta,
  icon,
  tone = 'default',
  onClick,
  className = ''
}: StatCardProps) {
  const interactive = Boolean(onClick)
  const Tag = interactive ? 'button' : 'div'

  return (
    <Tag
      {...(interactive ? { type: 'button' as const, onClick } : {})}
      className={`group relative flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-start shadow-xs transition-colors dark:border-slate-700 dark:bg-slate-800/40 ${
        TONE_EDGE[tone]
      } ${
        interactive
          ? 'outline-none hover:border-[color:var(--accent-line)] hover:bg-[color:var(--accent-tint)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] dark:hover:border-[color:var(--accent-line)]'
          : ''
      } ${className}`}
    >
      {icon && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-white dark:bg-slate-700/60 dark:text-slate-300 dark:group-hover:bg-slate-700">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span
          className={`block truncate text-lg font-semibold leading-tight tracking-tight tabular-nums ${TONE_CLASSES[tone]}`}
        >
          {value}
        </span>
        {sub && (
          <span className="block truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
            {sub}
          </span>
        )}
        {delta && (
          <span className="mt-0.5 block truncate text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">
            {delta}
          </span>
        )}
      </span>
      {interactive && (
        <ChevronRight
          aria-hidden="true"
          className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-[color:var(--accent-text)] opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
        />
      )}
    </Tag>
  )
}
