// features/settings/users-roles/hooks/useRoles.ts

import { useState, useEffect, useCallback } from 'react'
import type { RoleId, RoleInfo, Capability, CustomRolePayload } from '../types'
import { useToast } from '../../../../contexts/ToastContext'
import { DEFAULT_ROLE_CAPABILITIES, getAvailableBuiltinRoles } from '../constants'
import logger from '@/shared/utils/logger'

interface PermissionsApi {
  getRoles: () => Promise<Record<RoleId, RoleInfo>>
  setRole: (role: RoleId, caps: Capability[], opts?: { label?: string; description?: string }) => Promise<void>
  createRole?: (role: RoleId, label: string, description: string, caps: Capability[]) => Promise<void>
  deleteRole?: (role: RoleId) => Promise<void>
}

function getApi(): PermissionsApi | undefined {
  return (window as any).api?.permissions
}

function seedDefaults(): Record<RoleId, RoleInfo> {
  const out: Record<RoleId, RoleInfo> = {}
  for (const [role, caps] of Object.entries(DEFAULT_ROLE_CAPABILITIES)) {
    out[role] = {
      capabilities: caps,
      isDefault: true,
      isWildcard: role === 'admin',
    }
  }
  return out
}

export function useRoles() {
  const toast = useToast()
  const [roles, setRoles] = useState<Record<RoleId, RoleInfo>>({})
  const [loading, setLoading] = useState(true)
  const [savingRole, setSavingRole] = useState<RoleId | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const api = getApi()
      const res = api ? await api.getRoles() : seedDefaults()
      setRoles(res ?? {})
    } catch (e) {
      logger.error('useRoles.load', e)
      toast.error('Failed to load role permissions')
      setRoles(seedDefaults())
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const persist = useCallback(async (role: RoleId, caps: Capability[]) => {
    setSavingRole(role)
    try {
      const api = getApi()
      if (api) await api.setRole(role, caps)
      setRoles(prev => ({
        ...prev,
        [role]: { ...prev[role], capabilities: caps, isDefault: false },
      }))
    } catch (e: any) {
      logger.error('useRoles.persist', e)
      toast.error(e?.message ?? 'Failed to save')
      void load()
    } finally {
      setSavingRole(null)
    }
  }, [load, toast])

  const createCustomRole = useCallback(async (payload: CustomRolePayload): Promise<boolean> => {
    try {
      const api = getApi()
      if (!api) { toast.error('Permissions API not available'); return false }
      if (api.createRole) {
        await api.createRole(payload.id, payload.label, payload.description, payload.capabilities)
      } else {
        await api.setRole(payload.id, payload.capabilities, { label: payload.label, description: payload.description })
      }
      toast.success(`Role "${payload.label}" created`)
      await load()
      return true
    } catch (e: any) {
      logger.error('useRoles.createCustomRole', e)
      toast.error(e?.message ?? 'Failed to create role')
      return false
    }
  }, [load, toast])

  const deleteCustomRole = useCallback(async (role: RoleId): Promise<boolean> => {
    try {
      const api = getApi()
      if (!api?.deleteRole) {
        toast.error('Custom role deletion not supported')
        return false
      }
      await api.deleteRole(role)
      toast.success('Role deleted')
      await load()
      return true
    } catch (e: any) {
      logger.error('useRoles.deleteCustomRole', e)
      toast.error(e?.message ?? 'Failed to delete role')
      return false
    }
  }, [load, toast])

  const resetToDefaults = useCallback(async (role: RoleId) => {
    const def = DEFAULT_ROLE_CAPABILITIES[role] ?? []
    await persist(role, def)
    toast.success(`Reset ${role} to defaults`)
  }, [persist, toast])

  const customRoleIds = Object.entries(roles)
    .filter(([_, info]) => info.isCustom)
    .map(([id]) => id)

  return {
    roles, loading, savingRole, customRoleIds,
    load, persist, resetToDefaults,
    createCustomRole, deleteCustomRole,
    availableRoleIds: getAvailableBuiltinRoles(),
  }
}
