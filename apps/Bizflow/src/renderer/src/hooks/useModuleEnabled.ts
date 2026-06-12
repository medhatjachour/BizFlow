/**
 * useModuleEnabled / useEnabledModules
 *
 * Thin wrappers around ModuleContext so components only need to know about
 * these hooks and not the context internals.
 *
 * Because they read from React state (the context), toggling a module in
 * ModulesSettings → calling refreshModules() → updates the context state →
 * causes all consumers to re-render automatically.
 */
import type { ModuleId } from '@/shared/modules'
import { useModuleContext } from '../contexts/ModuleContext'

/** Returns true if the given module ID is currently enabled. */
export function useModuleEnabled(moduleId: ModuleId): boolean {
  const { enabledIds } = useModuleContext()
  return enabledIds.includes(moduleId)
}

/** Returns all enabled module IDs. */
export function useEnabledModules(): string[] {
  const { enabledIds } = useModuleContext()
  return enabledIds
}

/**
 * Returns a stable async function that re-fetches the enabled-module list
 * from the main process and updates the context, triggering re-renders in
 * every consumer (nav, routes, settings).
 */
export function useRefreshModules(): () => Promise<void> {
  const { refreshModules } = useModuleContext()
  return refreshModules
}

/**
 * @deprecated Use useRefreshModules() instead.
 * Kept so existing callers compile without changes.
 */
export function invalidateModuleCache(): void {
  // No-op: the old cache is gone.  Callers should migrate to useRefreshModules().
}
