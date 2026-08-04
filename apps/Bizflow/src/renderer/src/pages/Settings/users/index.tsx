// features/settings/users-roles/index.tsx

import { useState } from 'react'
import { Users, Shield } from 'lucide-react'
import { UserManagementSettings } from './components/UserManagementSettings'
import { RolePermissionsSettings } from './components/RolePermissionsSettings'
import { usePermissions } from './hooks/usePermissions'

type Tab = 'users' | 'roles'

export default function UsersRolesSettings() {
  const [tab, setTab] = useState<Tab>('users')
  const { canManageUsers, canManageSettings } = usePermissions()

  const tabs: { id: Tab; label: string; icon: typeof Users; visible: boolean }[] = [
    { id: 'users', label: 'Users', icon: Users, visible: canManageUsers },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield, visible: canManageSettings },
  ]

  const visibleTabs = tabs.filter(t => t.visible)
  const activeTab = visibleTabs.find(t => t.id === tab) ?? visibleTabs[0]

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        You don't have permission to access this section.
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Tab header */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${activeTab.id === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab.id === 'users' && <UserManagementSettings />}
        {activeTab.id === 'roles' && <RolePermissionsSettings />}
      </div>
    </div>
  )
}
