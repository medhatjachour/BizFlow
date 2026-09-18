// ─── Personal Work: loading placeholders ─────────────────────────────────────
// A skeleton keeps the shape of what is coming, so a panel does not collapse to
// a single line and then jump once data lands. Every shape mirrors a real one:
// `Rows` follows `ROW_SHELL`, `Cards` follows a collection of authored records,
// `Tiles` follows the capacity heatmap, `Lines`/`Detail` follow the money
// panels' label-value bodies.
//
// The pulse sits on each shape's root, not on every block, so a panel runs one
// animation; the app-wide `prefers-reduced-motion` guard in `main.css` then
// neutralises it for users who ask for stillness.
// ─────────────────────────────────────────────────────────────────────────────

import { ROW_SHELL } from './base'

const BLOCK = 'block rounded-md bg-slate-200/80 dark:bg-slate-700/60'

/** A single grey block; size it with `className` (e.g. `h-3 w-24`). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`${BLOCK} ${className}`} />
}

/** Stack of list-row placeholders, shaped like `ListRow`. */
export function SkeletonRows({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={ROW_SHELL}>
          <span className={`${BLOCK} h-7 w-7 shrink-0 rounded-lg`} />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className={`${BLOCK} h-3 w-2/5`} />
            <span className={`${BLOCK} h-2.5 w-1/4`} />
          </span>
          <span className={`${BLOCK} h-5 w-14 shrink-0`} />
        </div>
      ))}
    </div>
  )
}

/** Card stack placeholder for collections of authored records. */
export function SkeletonCards({
  count = 3,
  className = ''
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-2.5 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700"
        >
          <span className="flex items-center gap-2">
            <span className={`${BLOCK} h-7 w-7 shrink-0 rounded-lg`} />
            <span className={`${BLOCK} h-3 w-1/2`} />
          </span>
          <span className={`${BLOCK} h-2.5 w-4/5`} />
          <span className={`${BLOCK} h-2.5 w-3/5`} />
        </div>
      ))}
    </div>
  )
}

/** Compact tile grid placeholder, matching the capacity heatmap's rhythm. */
export function SkeletonTiles({
  count = 14,
  className = ''
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={`animate-pulse grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 ${className}`}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="space-y-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700"
        >
          <span className={`${BLOCK} h-2.5 w-3/5`} />
          <span className={`${BLOCK} h-5 w-4/5`} />
        </span>
      ))}
    </div>
  )
}

/** Label-value rows, for `BreakdownList` / `KeyValueList` style bodies. */
export function SkeletonLines({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2.5 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} className="flex items-center justify-between gap-3">
          <span className={`${BLOCK} h-3 w-1/3`} />
          <span className={`${BLOCK} h-3 w-1/5`} />
        </span>
      ))}
    </div>
  )
}

/** Detail-pane placeholder: metric band plus supporting rows. */
export function SkeletonDetail({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
          >
            <span className={`${BLOCK} h-2.5 w-1/2`} />
            <span className={`${BLOCK} h-5 w-3/5`} />
          </div>
        ))}
      </div>
      <SkeletonLines rows={rows} />
    </div>
  )
}

/** Paragraph placeholder, for rendered documents and long notes. */
export function SkeletonText({
  lines = 6,
  className = ''
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`animate-pulse space-y-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={index}
          className={`${BLOCK} h-3 ${index === lines - 1 ? 'w-2/5' : index % 3 === 1 ? 'w-11/12' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/** Every shape `EmptyState` can render while a panel waits for data. */
export const LOADING_SHAPES = {
  rows: <SkeletonRows />,
  cards: <SkeletonCards />,
  tiles: <SkeletonTiles />,
  lines: <SkeletonLines />,
  detail: <SkeletonDetail />,
  text: <SkeletonText />
} as const

export type LoadingShape = keyof typeof LOADING_SHAPES
