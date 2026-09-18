import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  /** One line on what the screen is for — or live context for it. */
  description?: ReactNode
  icon?: ReactNode
  /** Primary actions for the whole screen, pinned to the end of the header. */
  actions?: ReactNode
}

/**
 * Identity block for a tab. The tab strip names the screen; this says what it is
 * for and puts the screen's primary action in the one place a user looks first.
 */
export default function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent-tint)] text-[color:var(--accent-text)] ring-1 ring-[color:var(--accent-line)]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
