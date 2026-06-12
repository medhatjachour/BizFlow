/**
 * useOptimisticUpdate Hook
 * 
 * Provides optimistic UI updates with automatic rollback on error.
 * Updates the UI immediately before the server responds, then rolls back if the operation fails.
 * 
 * @example
 * ```tsx
 * const { execute, isOptimistic } = useOptimisticUpdate({
 *   onSuccess: () => logger.info('Success!'),
 *   onError: (error) => logger.error(error)
 * })
 * 
 * await execute({
 *   operation: async () => await api.deleteItem(id),
 *   optimisticUpdate: () => setItems(prev => prev.filter(i => i.id !== id)),
 *   rollback: () => setItems(originalItems)
 * })
 * ```
 */

import { useState, useCallback, useRef } from 'react'
import { logger } from '../../../shared/utils/logger'

interface OptimisticUpdateOptions<T = unknown> {
  /**
   * Called when the operation succeeds
   */
  onSuccess?: (result: T) => void
  /**
   * Called when the operation fails (after rollback)
   */
  onError?: (error: Error) => void
  /**
   * Optional timeout in milliseconds (default: 30000)
   */
  timeout?: number
}

interface ExecuteOptions<T = unknown> {
  /**
   * The async operation to perform (API call, etc.)
   */
  operation: () => Promise<T>
  /**
   * Update to apply immediately (before operation completes)
   */
  optimisticUpdate: () => void
  /**
   * Rollback function to call if operation fails
   */
  rollback: () => void
  /**
   * Optional description for logging
   */
  description?: string
}

interface UseOptimisticUpdateReturn {
  /**
   * Execute an optimistic update
   */
  execute: <T>(options: ExecuteOptions<T>) => Promise<T | undefined>
  /**
   * Whether an optimistic update is currently in progress
   */
  isOptimistic: boolean
  /**
   * Error from the last failed operation (if any)
   */
  error: Error | null
  /**
   * Clear the error state
   */
  clearError: () => void
}

/**
 * Custom hook for handling optimistic UI updates with automatic rollback
 */
export function useOptimisticUpdate<T = unknown>(
  options: OptimisticUpdateOptions<T> = {}
): UseOptimisticUpdateReturn {
  const { onSuccess, onError, timeout = 30000 } = options
  
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Execute an optimistic update with automatic rollback on failure
   */
  const execute = useCallback(
    async <TResult,>(executeOptions: ExecuteOptions<TResult>): Promise<TResult | undefined> => {
      const { operation, optimisticUpdate, rollback, description = 'operation' } = executeOptions

      // Cancel any pending operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this operation
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        setIsOptimistic(true)
        setError(null)

        logger.info(`[OptimisticUpdate] Starting ${description}`)

        // Apply optimistic update immediately
        optimisticUpdate()

        // Set timeout
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort()
        }, timeout)

        try {
          // Execute the actual operation
          const result = await operation()

          // Clear timeout if operation completed in time
          clearTimeout(timeoutId)

          // Check if aborted
          if (signal.aborted) {
            throw new Error('Operation was aborted')
          }

          logger.info(`[OptimisticUpdate] ${description} succeeded`)

          // Call success callback
          onSuccess?.(result as T)

          return result
        } catch (err) {
          clearTimeout(timeoutId)
          throw err
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')

        // Don't log abort errors
        if (!signal.aborted) {
          logger.error(`[OptimisticUpdate] ${description} failed:`, error)
        }

        // Rollback the optimistic update
        logger.info(`[OptimisticUpdate] Rolling back ${description}`)
        rollback()

        // Set error state
        setError(error)

        // Call error callback
        onError?.(error)

        return undefined
      } finally {
        setIsOptimistic(false)
        abortControllerRef.current = null
      }
    },
    [onSuccess, onError, timeout]
  )

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    execute,
    isOptimistic,
    error,
    clearError
  }
}

/**
 * Utility function to create a simple optimistic update for array operations
 */
export function createArrayOptimisticUpdate<TItem>(
  items: TItem[],
  setItems: (items: TItem[] | ((prev: TItem[]) => TItem[])) => void,
  getId: (item: TItem) => string | number
) {
  return {
    /**
     * Add an item optimistically
     */
    add: (item: TItem) => ({
      optimisticUpdate: () => setItems(prev => [...prev, item]),
      rollback: () => setItems(items)
    }),

    /**
     * Update an item optimistically
     */
    update: (id: string | number, updates: Partial<TItem>) => ({
      optimisticUpdate: () => setItems(prev =>
        prev.map(item => getId(item) === id ? { ...item, ...updates } : item)
      ),
      rollback: () => setItems(items)
    }),

    /**
     * Delete an item optimistically
     */
    remove: (id: string | number) => ({
      optimisticUpdate: () => setItems(prev => prev.filter(item => getId(item) !== id)),
      rollback: () => setItems(items)
    }),

    /**
     * Reorder items optimistically
     */
    reorder: (newOrder: TItem[]) => ({
      optimisticUpdate: () => setItems(newOrder),
      rollback: () => setItems(items)
    })
  }
}
