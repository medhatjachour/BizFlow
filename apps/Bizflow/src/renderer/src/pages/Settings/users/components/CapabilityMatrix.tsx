// features/settings/users-roles/components/CapabilityMatrix.tsx

import { useMemo } from 'react'
import type { Capability, RoleId } from '../types'
import { CapabilityGroup } from './CapabilityGroup'
import { getRelevantCapabilities, CAPABILITIES } from '../constants'
import { groupCapabilities } from '../utils'

interface Props {
  role: RoleId
  enabledCaps: Capability[]
  editable: boolean
  onToggle: (cap: Capability) => void
  onEnableAll: () => void
  onClearAll: () => void
  onResetDefaults: () => void
}

export function CapabilityMatrix({
  role, enabledCaps, editable, onToggle, onEnableAll, onClearAll, onResetDefaults,
}: Props) {
  const relevantCaps = useMemo(() => getRelevantCapabilities(), [])
  const grouped = useMemo(() => groupCapabilities(relevantCaps), [relevantCaps])
  const enabledSet = useMemo(() => new Set(enabledCaps), [enabledCaps])

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      {editable && (
        <div className="flex items-center gap-3 text-xs">
          <button onClick={onEnableAll} className="px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400">
            Enable all
          </button>
          <button onClick={onClearAll} className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
            Clear all
          </button>
          <button onClick={onResetDefaults} className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400">
            Reset to defaults
          </button>
        </div>
      )}

      {/* Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(grouped).map(([group, caps]) => (
          <CapabilityGroup
            key={group}
            group={group}
            caps={caps}
            enabledCaps={enabledSet}
            editable={editable}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
