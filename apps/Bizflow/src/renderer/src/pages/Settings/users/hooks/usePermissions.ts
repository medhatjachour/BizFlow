// features/settings/users-roles/hooks/usePermissions.ts

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@hooks/useAuth'
import type { Capability, RoleId } from '../types'
import { hasCapability as hasCap, resolveCapabilities } from '../utils'

export function usePermissions() {
  const { user, can } = useAuth()
  const [caps, setCaps] = useState<Capability[]>([])

  const refresh = useCallback(async () => {
    if (!user) { setCaps([]); return }
    try {
      const override = await (window as any).api?.permissions?.getMyCapabilities?.()
      setCaps(resolveCapabilities(user.role, override))
    } catch {
      setCaps(resolveCapabilities(user?.role))
    }
  }, [user])

  useEffect(() => {
    void refresh()
    const ipc = (window as any).electron?.ipcRenderer
    const off = ipc?.on?.('permissions:updated', () => void refresh())
    return () => { off?.() }
  }, [refresh])

  const has = useCallback((cap: Capability) => hasCap(caps, user?.role, cap), [caps, user])

  return {
    caps, has, can, refresh,
    currentRole: (user?.role ?? null) as RoleId | null,
    canManageUsers: has('manage_users'),
    canManageSettings: has('manage_settings'),
  }
}
