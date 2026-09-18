import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { LOADING_SHAPES, type LoadingShape } from './Skeleton'

interface EmptyStateProps {
  loading?: boolean
  /** Skeleton to show while `loading`; pick the one that matches the body. */
  loadingShape?: LoadingShape
  /** Announced to assistive tech while `loading` — pass the localised word for
   *  "loading". Omit when the same element also renders the empty state. */
  loadingLabel?: string
  /** Headline: what is missing. */
  title?: string
  /** Shown under the headline; defaults to a neutral "nothing here yet". */
  message?: string
  icon?: ReactNode
  action?: ReactNode
  /** `compact` for a panel body, `default` for a whole-tab fallback. */
  size?: 'compact' | 'default'
}

export default function EmptyState({
  loading,
  loadingShape = 'rows',
  loadingLabel,
  title,
  message,
  icon,
  action,
  size = 'default'
}: EmptyStateProps) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label={loadingLabel}>
        {LOADING_SHAPES[loadingShape]}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        size === 'compact' ? 'gap-2 py-5' : 'gap-2.5 py-8'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      {title && <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>}
      <p className={`${title ? 'text-xs' : 'text-sm'} text-slate-500 dark:text-slate-400`}>
        {message ?? '—'}
      </p>
      {action && <div className="mt-0.5 flex items-center gap-2">{action}</div>}
    </div>
  )
}
