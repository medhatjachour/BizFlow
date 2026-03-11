/**
 * useModuleEnabled
 *
 * Returns true if the given module ID is in the list of enabled modules
 * fetched from the main process.  The result is cached for the session;
 * pass `refresh = true` to re-fetch (e.g. after a settings change).
 */
import { useEffect, useState } from 'react'
import type { ModuleId } from '@/shared/modules'

// Cache so every component doesn't fire a separate IPC call
const cache: { ids: string[] | null } = { ids: null }

async function fetchEnabledIds(): Promise<string[]> {
  if (cache.ids !== null) return cache.ids
  try {
    const ids: string[] = await window.api.modules.getEnabled()
    cache.ids = ids
    return ids
  } catch {
    cache.ids = []
    return []
  }
}

/** Invalidate the in-memory cache (call after toggling a module in settings). */
export function invalidateModuleCache(): void {
  cache.ids = null
}

export function useModuleEnabled(moduleId: ModuleId): boolean {
  const [enabled, setEnabled] = useState<boolean>(false)

  useEffect(() => {
    fetchEnabledIds().then((ids) => {
      setEnabled(ids.includes(moduleId))
    })
  }, [moduleId])

  return enabled
}

/** Returns all enabled module IDs. */
export function useEnabledModules(): string[] {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    fetchEnabledIds().then(setIds)
  }, [])

  return ids
}
