/**
 * ModulesSettings
 *
 * Lets the admin enable / disable optional business modules.
 * Changes are persisted immediately via IPC; the nav link appears / disappears
 * on the next render cycle (useModuleEnabled re-fetches after invalidation).
 */

import { useState, useEffect } from 'react'
import { MODULE_REGISTRY } from '@/shared/modules'
import { useEnabledModules, invalidateModuleCache } from '../../hooks/useModuleEnabled'
import { ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  planned: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  future:  'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-400'
}

export default function ModulesSettings() {
  const enabledIds = useEnabledModules()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)
  const [restartNeeded, setRestartNeeded] = useState(false)

  // Sync pendingIds with remote state once loaded
  useEffect(() => {
    if (enabledIds.length > 0 || pendingIds.size === 0) {
      setPendingIds(new Set(enabledIds))
    }
  }, [enabledIds])

  async function handleToggle(moduleId: string, currentlyEnabled: boolean) {
    setSaving(moduleId)
    try {
      await window.api.modules.setEnabled(moduleId, !currentlyEnabled)
      invalidateModuleCache()
      setPendingIds(prev => {
        const next = new Set(prev)
        if (currentlyEnabled) next.delete(moduleId)
        else next.add(moduleId)
        return next
      })
      setRestartNeeded(true)
    } catch (err) {
      console.error('Failed to toggle module', moduleId, err)
    } finally {
      setSaving(null)
    }
  }

  const modules = Object.values(MODULE_REGISTRY)

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
        Business Modules
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Enable optional modules for your business type. Changes take effect after restart.
      </p>

      {restartNeeded && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Restart required</strong> — Restart the app to apply module changes.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {modules.map(mod => {
          const isEnabled = pendingIds.has(mod.id)
          const isSaving = saving === mod.id
          const isAlreadyActive = mod.status === 'active'

          return (
            <div
              key={mod.id}
              className={`flex items-start justify-between p-5 rounded-xl border transition-colors ${
                isEnabled
                  ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl mt-0.5">{mod.icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{mod.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[mod.status]}`}>
                      {mod.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {mod.description}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Models: {mod.models.join(', ')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(mod.id, isEnabled)}
                disabled={isSaving || isAlreadyActive}
                title={isAlreadyActive ? 'Core module — always enabled' : undefined}
                className={`flex-shrink-0 ml-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isEnabled
                    ? 'text-primary hover:text-primary/80'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {isSaving ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : isEnabled ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
