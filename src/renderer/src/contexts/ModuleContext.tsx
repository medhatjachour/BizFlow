/**
 * ModuleContext
 *
 * Single source of truth for enabled module IDs in the renderer.
 * Using a React context instead of a module-level cache ensures that
 * all consumers (App.tsx routes, RootLayout nav) re-render immediately
 * when modules are toggled — no restart required.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface ModuleContextValue {
  enabledIds: string[]
  refreshModules: () => Promise<void>
}

const ModuleContext = createContext<ModuleContextValue>({
  enabledIds: [],
  refreshModules: async () => {}
})

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [enabledIds, setEnabledIds] = useState<string[]>([])

  const refreshModules = useCallback(async () => {
    try {
      const ids: string[] = await window.api.modules.getEnabled()
      setEnabledIds(ids)
    } catch {
      setEnabledIds([])
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    refreshModules()
  }, [refreshModules])

  return (
    <ModuleContext.Provider value={{ enabledIds, refreshModules }}>
      {children}
    </ModuleContext.Provider>
  )
}

export function useModuleContext(): ModuleContextValue {
  return useContext(ModuleContext)
}
