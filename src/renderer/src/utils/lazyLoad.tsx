/**
 * Lazy Loading Components
 * 
 * Code splitting and dynamic imports for performance
 */

import { lazy, Suspense, ComponentType } from 'react'
import { Spinner } from '../components/ui/Spinner'

/**
 * Lazy load component with custom fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(factory)

  return (props: any) => (
    <Suspense fallback={fallback || <Spinner size="lg" />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

/**
 * Lazy load with retry on failure
 */
export function lazyLoadWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  maxRetries: number = 3
) {
  return lazy(() =>
    retry(factory, maxRetries).catch(() => {
      // Fallback to error component
      const ErrorComponent: any = () => (
        <div className="p-8 text-center">
          <p className="text-red-500">Failed to load component</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      )
      return { default: ErrorComponent }
    })
  )
}

/**
 * Retry failed imports
 */
async function retry<T>(
  fn: () => Promise<T>,
  retriesLeft: number = 3,
  interval: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retriesLeft === 0) {
      throw error
    }

    await new Promise(resolve => setTimeout(resolve, interval))
    return retry(fn, retriesLeft - 1, interval * 2)
  }
}

/**
 * Preload lazy component
 */
export function preload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): void {
  factory().catch(() => {
    // Ignore preload errors
  })
}

/**
 * Lazy load with route-based code splitting
 */
export const LazyRoutes = {
  Dashboard: lazyLoad(() => import('../pages/Dashboard')),
  Inventory: lazyLoad(() => import('../plugins/commerce/pages/Inventory')),
  Sales: lazyLoad(() => import('../plugins/commerce/pages/Sales')),
  Customers: lazyLoad(() => import('../pages/Customers/Customers')),
  Employees: lazyLoad(() => import('../pages/Employees')),
  Stores: lazyLoad(() => import('../plugins/commerce/pages/Stores')),
  Reports: lazyLoad(() => import('../pages/Reports/Reports')),
  Settings: lazyLoad(() => import('../pages/Settings'))
}

/**
 * Prefetch routes on hover
 */
export function usePrefetch() {
  const prefetchedRoutes = new Set<string>()

  return (routeName: keyof typeof LazyRoutes) => {
    if (prefetchedRoutes.has(routeName)) return

    prefetchedRoutes.add(routeName)

    // Prefetch on next idle callback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const route = LazyRoutes[routeName]
        if (route) {
          // Trigger lazy load
          const Component = route
          // Access the lazy component to trigger load
          Component.toString()
        }
      })
    }
  }
}
