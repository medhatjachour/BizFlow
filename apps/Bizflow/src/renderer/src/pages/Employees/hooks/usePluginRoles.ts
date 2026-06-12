/**
 * usePluginRoles
 *
 * Returns role/department groups scoped to the currently-enabled modules.
 * The "General" group is always present. Plugin-specific groups are added
 * dynamically based on ModuleContext, so the add/edit employee form shows
 * only roles that are actually relevant to this installation.
 */

import { useMemo } from 'react'
import { useModuleContext } from '../../../contexts/ModuleContext'

export type RoleColor = 'slate' | 'indigo' | 'amber' | 'rose' | 'blue' | 'teal'

export interface RoleGroup {
  moduleId: string
  label: string
  icon: string
  color: RoleColor
  roles: string[]
  departments: string[]
}

// ─── Per-plugin role/department definitions ───────────────────────────────────

const PLUGIN_ROLE_GROUPS: Record<string, Omit<RoleGroup, 'moduleId'>> = {
  commerce: {
    label: 'Commerce',
    icon: '🛒',
    color: 'indigo',
    roles: ['Cashier', 'Store Manager', 'Sales Associate', 'Inventory Clerk', 'Purchasing Officer', 'Customer Service Rep'],
    departments: ['Sales', 'Inventory', 'Purchasing'],
  },
  bakery: {
    label: 'Bakery',
    icon: '🥐',
    color: 'amber',
    roles: ['Baker', 'Pastry Chef', 'Production Supervisor', 'Packaging Operator', 'Quality Inspector'],
    departments: ['Production', 'Bakery', 'Quality Control'],
  },
  restaurant: {
    label: 'Restaurant',
    icon: '🍽️',
    color: 'rose',
    roles: ['Head Chef', 'Sous Chef', 'Waiter', 'Waitress', 'Host', 'Bartender', 'Kitchen Staff', 'Dishwasher'],
    departments: ['Kitchen', 'Front of House', 'Restaurant'],
  },
  warehouse: {
    label: 'Warehouse',
    icon: '🏭',
    color: 'blue',
    roles: ['Warehouse Manager', 'Stock Controller', 'Forklift Operator', 'Picker/Packer', 'Logistics Coordinator', 'Inventory Auditor'],
    departments: ['Warehouse', 'Logistics', 'Distribution'],
  },
  clinic: {
    label: 'Clinic',
    icon: '🏥',
    color: 'teal',
    roles: ['Doctor', 'Nurse', 'Head Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist', 'Physiotherapist', 'Radiologist', 'Medical Assistant'],
    departments: ['Clinic', 'Medical', 'Laboratory', 'Pharmacy'],
  },
}

// ─── Base group always shown ──────────────────────────────────────────────────

const BASE_GROUP: Omit<RoleGroup, 'moduleId'> = {
  label: 'General',
  icon: '🏢',
  color: 'slate',
  roles: ['General Manager', 'Manager', 'Supervisor', 'Accountant', 'HR Officer', 'IT Technician', 'Security Guard', 'Delivery Driver', 'Admin Assistant', 'Cleaner', 'Other'],
  departments: ['Management', 'Finance', 'HR', 'IT', 'Operations', 'Administration'],
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePluginRoles() {
  const { enabledIds } = useModuleContext()

  return useMemo(() => {
    const groups: RoleGroup[] = [
      { moduleId: 'base', ...BASE_GROUP },
      ...enabledIds
        .filter(id => id in PLUGIN_ROLE_GROUPS)
        .map(id => ({ moduleId: id, ...PLUGIN_ROLE_GROUPS[id] })),
    ]

    const allRoles = Array.from(new Set(groups.flatMap(g => g.roles)))
    const allDepartments = Array.from(new Set(groups.flatMap(g => g.departments)))

    /** Find which group a role belongs to (for colour/dept auto-suggestion). */
    function groupForRole(role: string): RoleGroup | undefined {
      return groups.find(g => g.roles.some(r => r.toLowerCase() === role.toLowerCase()))
    }

    return { groups, allRoles, allDepartments, groupForRole }
  }, [enabledIds])
}
