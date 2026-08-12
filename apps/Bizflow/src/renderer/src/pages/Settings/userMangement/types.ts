import type { PluginId, PluginRoleAssignments } from '../../../../../shared/permissions'

export interface User {
  id: string
  username: string
  fullName: string | null
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
  lastLogin: string | null
  pluginRoles: PluginRoleAssignments
}

export interface NewUser {
  username: string
  password: string
  confirmPassword: string
  fullName: string
  email: string
  phone: string
  role: string
  pluginRoles: PluginRoleAssignments
}

export type RoleMeta = {
  label: string
  description: string
  color: string
}

export type PluginRoleOption = {
  id: PluginId
  label: string
  roles: Array<{ key: string; label: string }>
}
