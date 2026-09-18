import type { ReactNode } from 'react'

interface FormSectionProps {
  title?: ReactNode
  description?: ReactNode
  /** Extra classes for the body grid, e.g. `sm:grid-cols-2`. */
  className?: string
  children: ReactNode
}

/**
 * Groups the fields inside a modal or a drawer. Long forms reached ten inputs in
 * one column; the section heading is what makes them scannable instead.
 */
export function FormSection({ title, description, className = '', children }: FormSectionProps) {
  return (
    <section className="space-y-3">
      {(title || description) && (
        <header className="space-y-0.5">
          {title && (
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </header>
      )}
      <div className={`space-y-3 ${className}`}>{children}</div>
    </section>
  )
}

interface ModalFooterProps {
  children: ReactNode
  /** Left side of the bar — use it for a destructive or secondary escape hatch. */
  start?: ReactNode
  className?: string
}

/** Action bar at the bottom of a modal: secondary left, primary right. */
export function ModalFooter({ children, start, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/70 ${className}`}
    >
      {start ? <div className="flex items-center gap-2">{start}</div> : <span />}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

interface DangerZoneProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}

/** Destructive actions get their own bordered block, never a row in a list. */
export function DangerZone({ title, description, children }: DangerZoneProps) {
  return (
    <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
      <div>
        <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-300">{title}</h4>
        {description && (
          <p className="mt-0.5 text-xs text-rose-600/90 dark:text-rose-300/80">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  )
}
