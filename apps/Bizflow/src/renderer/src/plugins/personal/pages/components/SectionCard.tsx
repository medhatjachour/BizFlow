import type { ReactNode } from 'react'
import { CARD, CARD_HEADER, TITLE_TEXT } from './base'

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  /** Rendered under the body, above the card border — for totals and footnotes. */
  footer?: ReactNode
  className?: string
  padded?: boolean
  /** Tightens the body for panels that hold rows rather than forms. */
  dense?: boolean
}

/**
 * A titled panel. Used for every secondary block under a tab's metric band, so
 * the header rhythm here is what makes a stack of panels read as one page.
 */
export default function SectionCard({
  title,
  description,
  icon,
  actions,
  children,
  footer,
  className = '',
  padded = true,
  dense = false
}: SectionCardProps) {
  return (
    <section className={`${CARD} ${className}`}>
      {(title || actions) && (
        <header className={CARD_HEADER}>
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className={`truncate ${TITLE_TEXT}`}>{title}</h3>}
              {description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? (dense ? 'p-3' : 'p-4') : ''}>{children}</div>
      {footer && (
        <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700/70">
          {footer}
        </div>
      )}
    </section>
  )
}
