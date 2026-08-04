// features/settings/users-roles/components/CapabilityGroup.tsx

import type { Capability, CapabilityGroup as GroupName } from '../types'
import { CapabilityToggle } from './CapabilityToggle'

interface Props {
  group: GroupName | string
  caps: Capability[]
  enabledCaps: Set<Capability>
  editable: boolean
  onToggle: (cap: Capability) => void
}

export function CapabilityGroup({ group, caps, enabledCaps, editable, onToggle }: Props) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        {group}
      </h4>
      <div className="space-y-2">
        {caps.map(cap => (
          <CapabilityToggle
            key={cap}
            cap={cap}
            enabled={enabledCaps.has(cap)}
            editable={editable}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
