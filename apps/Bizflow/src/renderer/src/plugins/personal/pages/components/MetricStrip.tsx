import type { ReactNode } from 'react'
import { MICRO_LABEL } from './base'

type StripSize = 'three' | 'four' | 'six'

const GRID: Record<StripSize, string> = {
  three: 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3',
  four: 'grid grid-cols-2 gap-2.5 lg:grid-cols-4',
  six: 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6'
}

interface MetricStripProps {
  /** Names the band, so a wall of tiles reads as one answer, not six numbers. */
  heading?: ReactNode
  hint?: ReactNode
  size?: StripSize
  children: ReactNode
}

/** KPI band: an optional heading over a consistent tile grid. */
export default function MetricStrip({ heading, hint, size = 'four', children }: MetricStripProps) {
  return (
    <div>
      {(heading || hint) && (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          {heading && <h3 className={MICRO_LABEL}>{heading}</h3>}
          {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
        </div>
      )}
      <div className={GRID[size]}>{children}</div>
    </div>
  )
}
