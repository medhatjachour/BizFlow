// features/settings/users-roles/components/CapabilityToggle.tsx

import { Check } from 'lucide-react'
import type { Capability } from '../types'
import { CAPABILITIES } from '../constants'

interface Props {
  cap: Capability
  enabled: boolean
  editable: boolean
  onToggle: (cap: Capability) => void
}

export function CapabilityToggle({ cap, enabled, editable, onToggle }: Props) {
  const meta = CAPABILITIES[cap]
  return (
    <button
      type="button"
      onClick={() => editable && onToggle(cap)}
      disabled={!editable}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-all text-left
        ${enabled
          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
          : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'}
        ${editable ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed opacity-75'}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${enabled ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
          {meta.label}
        </p>
        {meta.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</p>
        )}
      </div>
      <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}>
          {enabled && <Check className="w-3 h-3 text-blue-600 mx-auto" />}
        </div>
      </div>
    </button>
  )
}
