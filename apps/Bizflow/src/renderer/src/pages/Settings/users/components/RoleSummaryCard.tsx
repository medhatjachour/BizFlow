// features/settings/users-roles/components/RoleSummaryCard.tsx

import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import type { RoleId, RoleInfo } from '../types'
import { getRoleMeta, getRelevantCapabilities } from '../constants'
import { diffFromDefault, capabilityCountLabel } from '../utils'

interface Props {
  role: RoleId
  info: RoleInfo
  saving: boolean
  editable: boolean
  onReset: () => void
}

export function RoleSummaryCard({ role, info, saving, editable, onReset }: Props) {
  const meta = getRoleMeta(role)
  const totalCaps = getRelevantCapabilities().length
  const count = info.isWildcard ? totalCaps : info.capabilities.length
  const diff = diffFromDefault(role, info.capabilities)

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 mb-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{meta.label}</h3>
          {info.isWildcard ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              full access
            </span>
          ) : info.isDefault ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              default
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              customised
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            · {capabilityCountLabel(count, totalCaps)}
          </span>
          {diff.isModified && !info.isWildcard && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {diff.added.length > 0 && `+${diff.added.length}`}
              {diff.removed.length > 0 && `−${diff.removed.length}`}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meta.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {saving && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        {editable && !info.isWildcard && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
