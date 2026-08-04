// features/settings/users-roles/components/RoleSelector.tsx

import { Lock, Plus } from 'lucide-react'
import type { RoleId, RoleInfo } from '../types'
import { getRoleMeta, getRelevantCapabilities } from '../constants'

interface Props {
  roles: Record<RoleId, RoleInfo>
  customRoleIds: RoleId[]
  selected: RoleId
  onSelect: (r: RoleId) => void
  onCreateNew: () => void
  canCreate: boolean
}

export function RoleSelector({ roles, customRoleIds, selected, onSelect, onCreateNew, canCreate }: Props) {
  const totalCaps = getRelevantCapabilities().length
  const roleKeys = Object.keys(roles).sort((a, b) => {
    const order = ['admin', 'manager', 'finance', 'inventory', 'sales', 'cashier']
    const ai = order.indexOf(a), bi = order.indexOf(b)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    return a.localeCompare(b)
  })

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {roleKeys.map(role => {
        const r = roles[role]
        const meta = getRoleMeta(role)
        const count = r.isWildcard ? totalCaps : r.capabilities.length
        const isSel = role === selected
        const isCustom = customRoleIds.includes(role)

        return (
          <button
            key={role}
            onClick={() => onSelect(role)}
            className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all
              ${isSel
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'}`}
          >
            {r.isWildcard && <Lock className="w-3.5 h-3.5" />}
            {meta.label}
            {isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Custom</span>}
            <span className={`text-[11px] tabular-nums ${isSel ? 'text-blue-100' : 'text-slate-400'}`}>
              {count}/{totalCaps}
            </span>
          </button>
        )
      })}

      {canCreate && (
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-blue-400 hover:text-blue-600"
        >
          <Plus className="w-3.5 h-3.5" />
          New role
        </button>
      )}
    </div>
  )
}
