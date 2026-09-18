import type { ReactNode } from 'react'

export interface KeyValueItem {
  label: ReactNode
  value: ReactNode
  /** Renders the value in the accent tone, for the figure the panel is about. */
  emphasis?: boolean
}

interface KeyValueListProps {
  items: KeyValueItem[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

const COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4'
}

/** Definition list for detail panels: label above value, never a bare label row. */
export default function KeyValueList({ items, columns = 2, className = '' }: KeyValueListProps) {
  return (
    <dl className={`grid gap-x-6 gap-y-2.5 ${COLUMNS[columns]} ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="truncate text-xs text-slate-500 dark:text-slate-400">{item.label}</dt>
          <dd
            className={`mt-0.5 truncate text-sm tabular-nums ${
              item.emphasis
                ? 'font-semibold text-[color:var(--accent-text)]'
                : 'font-medium text-slate-800 dark:text-slate-100'
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
