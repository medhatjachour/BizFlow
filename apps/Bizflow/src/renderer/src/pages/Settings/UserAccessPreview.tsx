import { useEffect } from 'react'
import { X, ShieldCheck, Lock } from 'lucide-react'
import { CAPABILITIES, ALL_CAPABILITIES, pluginRoleLabel } from '../../../../shared/permissions'
import { getRoleMeta } from './userMangement/utils'
import { effectiveCapabilities } from './permissionsUtils'
import type { RolesMap } from './RolePermissionsSettings'
import type { User } from './userMangement/types'

type Props = {
  user: User
  roles: RolesMap
  onClose: () => void
}

export default function UserAccessPreview({ user, roles, onClose }: Props) {
  const caps = effectiveCapabilities(user, roles)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = ALL_CAPABILITIES.reduce<Record<string, string[]>>((acc, cap) => {
    if (!caps.includes(cap)) return acc
    const group = CAPABILITIES[cap].group
    ;(acc[group] ??= []).push(CAPABILITIES[cap].label)
    return acc
  }, {})

  const pluginAssignments = Object.entries(user.pluginRoles ?? {})
    .filter(([, role]) => !!role)
    .map(([plugin, role]) => ({ plugin, role }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-medium text-slate-700 dark:text-slate-200">
              {(user.fullName || user.username).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user.fullName || user.username}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRoleMeta(user.role).color}`}>
            {user.role === 'admin' ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Owner / Admin</span> : getRoleMeta(user.role).label}
          </span>
          {pluginAssignments.map(({ plugin, role }) => (
            <span key={plugin} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              {pluginRoleLabel(role)}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> What {user.fullName || user.username} can do
          </h4>
          {caps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No access granted yet — assign a role to unlock pages and actions.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {Object.entries(groups).map(([group, labels]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {labels.map(label => (
                      <span key={label} className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
