/**
 * Skeleton Component
 * 
 * Loading placeholder with shimmer animation
 * Used to show content structure while data is loading
 * 
 * @example
 * ```tsx
 * <Skeleton className="h-8 w-48" />
 * <Skeleton variant="circle" className="h-12 w-12" />
 * <Skeleton variant="text" className="w-full" />
 * ```
 */

import { cn } from '@renderer/utils/cn'

interface SkeletonProps {
  /**
   * Variant determines the shape
   */
  variant?: 'rectangular' | 'circular' | 'text'
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Animation type
   */
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  variant = 'rectangular',
  className = '',
  animation = 'pulse'
}: Readonly<SkeletonProps>) {
  const baseClasses = 'bg-slate-200 dark:bg-slate-700'
  
  const variantClasses = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4'
  }
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%]',
    none: ''
  }

  return (
    <output
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      aria-label="Loading..."
      aria-live="polite"
    >
      <span className="sr-only">Loading...</span>
    </output>
  )
}

/**
 * Skeleton variants for common use cases
 */
export const SkeletonText = ({ className = '' }: { className?: string }) => (
  <Skeleton variant="text" className={className} />
)

export const SkeletonCircle = ({ className = '' }: { className?: string }) => (
  <Skeleton variant="circular" className={className} />
)

export const SkeletonRect = ({ className = '' }: { className?: string }) => (
  <Skeleton variant="rectangular" className={className} />
)
