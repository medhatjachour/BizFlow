import type { ReactNode } from 'react'
import { HOVER_ROW, ROW_SHELL } from './base'

interface ListRowProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  /** Right-hand side: a status pill, an amount, or a row action. */
  trailing?: ReactNode
  selected?: boolean
  onClick?: () => void
  /** `plain` drops the border for rows stacked inside an already-bordered card. */
  variant?: 'card' | 'plain'
  className?: string
}

/**
 * The row shape the plugin's lists share: icon, a truncated title with one line
 * of meta, and a trailing slot that keeps every row the same height.
 */
export default function ListRow({
  title,
  subtitle,
  icon,
  trailing,
  selected = false,
  onClick,
  variant = 'card',
  className = ''
}: ListRowProps) {
  const Tag = onClick ? 'button' : 'div'
  const selectedRing = selected
    ? 'border-[color:var(--accent-line)] bg-[color:var(--accent-tint)]'
    : ''

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`${variant === 'card' ? ROW_SHELL : 'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start'} ${
        onClick
          ? `${HOVER_ROW} outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]`
          : ''
      } ${selectedRing} ${className}`}
    >
      {icon && <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
    </Tag>
  )
}
