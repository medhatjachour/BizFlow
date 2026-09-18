// ─── Personal Work: amount breakdown list ────────────────────────────────────
// The money screens all owe the same answer ("what exactly is this number?"), so
// every breakdown of a quoted amount renders through this one list. Keep the tone
// vocabulary closed: a caller should not be able to invent a colour for money.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

export type BreakdownTone = 'default' | 'muted' | 'accent' | 'negative' | 'total'

export interface BreakdownRow {
  label: string
  value: string
  tone?: BreakdownTone
  hint?: string
}

const TONE_CLASS: Record<BreakdownTone, string> = {
  default: 'text-slate-700 dark:text-slate-200',
  muted: 'text-slate-500 dark:text-slate-400',
  accent: 'text-[color:var(--accent-text)]',
  negative: 'text-rose-600 dark:text-rose-400',
  total: 'text-slate-900 font-semibold dark:text-white'
}

const TONE_LABEL_CLASS: Record<BreakdownTone, string> = {
  default: 'text-slate-600 dark:text-slate-300',
  muted: 'text-slate-500 dark:text-slate-400',
  accent: 'text-slate-600 dark:text-slate-300',
  negative: 'text-slate-600 dark:text-slate-300',
  total: 'text-slate-900 dark:text-white'
}

export default function BreakdownList({
  rows,
  footer,
  className = ''
}: {
  rows: BreakdownRow[]
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40 ${className}`}
    >
      <dl className="space-y-1.5 text-sm">
        {rows.map((row, index) => {
          const tone = row.tone ?? 'default'
          const isTotal = tone === 'total'
          return (
            <div
              key={`${row.label}-${index}`}
              className={`flex items-baseline justify-between gap-4 ${
                isTotal ? 'mt-1.5 border-t border-slate-200 pt-2 dark:border-slate-700' : ''
              }`}
            >
              <dt className={`min-w-0 ${TONE_LABEL_CLASS[tone]}`}>
                <span className="truncate">{row.label}</span>
                {row.hint && (
                  <span className="ms-1.5 text-xs text-slate-400 dark:text-slate-500">
                    {row.hint}
                  </span>
                )}
              </dt>
              <dd className={`shrink-0 tabular-nums ${TONE_CLASS[tone]}`}>{row.value}</dd>
            </div>
          )
        })}
      </dl>
      {footer && (
        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">{footer}</div>
      )}
    </div>
  )
}
