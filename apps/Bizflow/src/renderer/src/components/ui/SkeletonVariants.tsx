/**
 * Table Skeleton Loaders
 * 
 * Specialized skeleton components for table loading states
 */

import { Skeleton } from './Skeleton'

interface TableSkeletonProps {
  /**
   * Number of rows to display
   */
  rows?: number
  /**
   * Number of columns to display
   */
  columns?: number
  /**
   * Show table header
   */
  showHeader?: boolean
}

/**
 * Skeleton for table loading state
 */
export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: Readonly<TableSkeletonProps>) {
  return (
    <div className="w-full" role="status" aria-label="Loading table data">
      {showHeader && (
        <div className="border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-6 w-3/4"
              />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading table data...</span>
    </div>
  )
}

/**
 * Skeleton for card loading state
 */
export function CardSkeleton({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <div className={`p-6 border border-slate-200 dark:border-slate-700 rounded-lg ${className}`}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

/**
 * Skeleton for list item loading state
 */
export function ListItemSkeleton({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      <Skeleton variant="circular" className="h-12 w-12 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  )
}

/**
 * Skeleton for metric card loading state
 */
export function MetricCardSkeleton({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <div className={`p-4 border border-slate-200 dark:border-slate-700 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/**
 * Skeleton for form loading state
 */
export function FormSkeleton({ fields = 4, className = '' }: Readonly<{ fields?: number; className?: string }>) {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`form-field-${i}`}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
