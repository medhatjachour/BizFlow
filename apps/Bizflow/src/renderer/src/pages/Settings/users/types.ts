// features/settings/users-roles/types.ts

export type PluginId =
  | 'commerce' | 'bakery' | 'restaurant' | 'warehouse'
  | 'clinic' | 'vet' | 'coffee' | 'pharmacy'

export type CoreRole = 'admin' | 'manager'

export type PluginRole =
  | 'sales' | 'inventory' | 'finance'
  | 'clinic_staff' | 'vet_staff'
  | 'bakery_staff' | 'restaurant_staff'
  | 'warehouse_staff' | 'coffee_staff' | 'pharmacy_staff'

export type BuiltinRole = CoreRole | PluginRole

export type RoleId = string

export interface User {
  id: string
  username: string
  fullName: string | null
  email: string | null
  phone: string | null
  role: RoleId
  isActive: boolean
  createdAt: string
  lastLogin: string | null
  createdBy?: string | null
}

export interface NewUserPayload {
  username: string
  password: string
  fullName: string
  email: string
  phone: string
  role: RoleId
}

export interface UpdateUserPayload {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  role?: RoleId
  isActive?: boolean
}

export interface PasswordChangePayload {
  newPassword: string
  confirmPassword: string
}

export type CapabilityGroup =
  | 'Visibility' | 'Sales' | 'Operations'
  | 'Administration' | 'Commerce' | 'Bakery' | 'Restaurant'
  | 'Warehouse' | 'Clinic' | 'Vet' | 'Coffee' | 'Pharmacy'

export interface CapabilityMeta {
  label: string
  group: CapabilityGroup
  description?: string
  plugin?: PluginId
}

export interface RoleMeta {
  id: RoleId
  label: string
  description: string
  color: string
  plugin?: PluginId
  isWildcard?: boolean
  isCustom?: boolean
  isDefault?: boolean
}

export interface RoleInfo {
  capabilities: Capability[]
  isDefault: boolean
  isWildcard: boolean
  isCustom?: boolean
  label?: string
  description?: string
}

export type Capability = string

export interface DeleteCheckResult {
  canDelete: boolean
  dependencies?: {
    transactions?: number
    sales?: number
    stock?: number
    refunds?: number
    variants?: number
  }
  message: string
  suggestedAction: 'DELETE' | 'ARCHIVE' | 'CANCEL'
}

export interface UserFilters {
  search: string
  role: RoleId | 'all'
  status: 'all' | 'active' | 'inactive'
  page: number
  pageSize: number
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
}

export type DialogKind =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'edit'; user: User }
  | { kind: 'password'; user: User }
  | { kind: 'delete'; user: User; check: DeleteCheckResult }

export interface CustomRolePayload {
  id: RoleId
  label: string
  description: string
  capabilities: Capability[]
}
