/**
 * ModulesSettings
 *
 * Lets the admin enable / disable optional business modules.
 * Changes are persisted immediately via IPC; a relaunch button applies them.
 */

import { useState, useEffect } from 'react'
import { MODULE_REGISTRY } from '@/shared/modules'
import { useEnabledModules, useRefreshModules } from '../../hooks/useModuleEnabled'
import { Check, RefreshCw, Power, PowerOff, ChevronDown, ChevronUp, Database } from 'lucide-react'

/** Map of module id → build-time flag. Only bundled plugins are shown. */
const BUNDLED_PLUGIN_FLAGS: Record<string, boolean> = {
  commerce:   typeof __PLUGIN_COMMERCE__   !== 'undefined' && __PLUGIN_COMMERCE__,
  bakery:     typeof __PLUGIN_BAKERY__     !== 'undefined' && __PLUGIN_BAKERY__,
  restaurant: typeof __PLUGIN_RESTAURANT__ !== 'undefined' && __PLUGIN_RESTAURANT__,
  warehouse:  typeof __PLUGIN_WAREHOUSE__  !== 'undefined' && __PLUGIN_WAREHOUSE__,
  clinic:     typeof __PLUGIN_CLINIC__     !== 'undefined' && __PLUGIN_CLINIC__,
  vet:        typeof __PLUGIN_VET__        !== 'undefined' && __PLUGIN_VET__,
  gym:        typeof __PLUGIN_GYM__        !== 'undefined' && __PLUGIN_GYM__,
}

const COLOR_MAP: Record<string, { ring: string; bg: string; icon: string; badge: string }> = {
  indigo: {
    ring:  'border-indigo-300  dark:border-indigo-700',
    bg:    'bg-indigo-50        dark:bg-indigo-900/20',
    icon:  'bg-indigo-100      dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  amber: {
    ring:  'border-amber-300  dark:border-amber-700',
    bg:    'bg-amber-50        dark:bg-amber-900/20',
    icon:  'bg-amber-100      dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  rose: {
    ring:  'border-rose-300   dark:border-rose-700',
    bg:    'bg-rose-50         dark:bg-rose-900/20',
    icon:  'bg-rose-100       dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  blue: {
    ring:  'border-blue-300   dark:border-blue-700',
    bg:    'bg-blue-50         dark:bg-blue-900/20',
    icon:  'bg-blue-100       dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  teal: {
    ring:  'border-teal-300   dark:border-teal-700',
    bg:    'bg-teal-50         dark:bg-teal-900/20',
    icon:  'bg-teal-100       dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  violet: {
    ring:  'border-violet-300  dark:border-violet-700',
    bg:    'bg-violet-50        dark:bg-violet-900/20',
    icon:  'bg-violet-100      dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
}

const STATUS_BADGE: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  planned: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  future:  'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-400',
}

export default function ModulesSettings() {
  const enabledIds = useEnabledModules()
  const refreshModules = useRefreshModules()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [restartNeeded, setRestartNeeded] = useState(false)
  const [relaunching, setRelaunching] = useState(false)

  useEffect(() => {
    if (enabledIds.length > 0 || pendingIds.size === 0) {
      setPendingIds(new Set(enabledIds))
    }
  }, [enabledIds])

  async function handleToggle(moduleId: string, currentlyEnabled: boolean) {
    setSaving(moduleId)
    try {
      await window.api.modules.setEnabled(moduleId, !currentlyEnabled)
      await refreshModules()
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

  async function handleRelaunch() {
    setRelaunching(true)
    await window.api.modules.relaunch()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const modules = Object.values(MODULE_REGISTRY).filter(mod => BUNDLED_PLUGIN_FLAGS[mod.id])
  const noBundled = modules.length === 0

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Business Modules</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enable the modules that match your business type. Disabled modules are hidden from the menu
          but their data is preserved — you can re-enable at any time without losing anything.
        </p>
      </div>

      {/* Restart banner */}
      {restartNeeded && (
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Restart required</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Module changes are saved. Restart the app to activate them.
              </p>
            </div>
          </div>
          <button
            onClick={handleRelaunch}
            disabled={relaunching}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${relaunching ? 'animate-spin' : ''}`} />
            {relaunching ? 'Restarting…' : 'Restart Now'}
          </button>
        </div>
      )}

      {/* No bundled plugins */}
      {noBundled && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium mb-1">No modules bundled</p>
          <p className="text-sm">This build was compiled without optional modules. Rebuild with ENABLED_MODULES to include them.</p>
        </div>
      )}

      {/* Module cards */}
      <div className="space-y-4">
        {modules.map(mod => {
          const isEnabled = pendingIds.has(mod.id)
          const isSaving = saving === mod.id
          const isExpanded = expanded.has(mod.id)
          const colors = COLOR_MAP[mod.color] ?? COLOR_MAP.blue

          return (
            <div
              key={mod.id}
              className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                isEnabled ? colors.ring : 'border-slate-200 dark:border-slate-700'
              } ${isEnabled ? colors.bg : 'bg-white dark:bg-slate-800'}`}
            >
              {/* Card header */}
              <div className="flex items-center gap-4 p-5">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  isEnabled ? colors.icon : 'bg-slate-100 dark:bg-slate-700'
                }`}>
                  {mod.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white">{mod.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[mod.status]}`}>
                      {mod.status}
                    </span>
                    {isEnabled && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                    {mod.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Expand details */}
                  <button
                    onClick={() => toggleExpand(mod.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Show details"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(mod.id, isEnabled)}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEnabled
                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {isSaving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : isEnabled ? (
                      <PowerOff size={16} />
                    ) : (
                      <Power size={16} />
                    )}
                    {isSaving ? 'Saving…' : isEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* Expandable detail panel */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Feature list */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      What's included
                    </p>
                    <ul className="space-y-1.5">
                      {mod.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Check size={14} className="mt-0.5 text-emerald-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Data info */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Data tables
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {mod.models.map(m => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-mono"
                        >
                          <Database size={10} />
                          {m}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      Disabling this module hides the menu and UI but{' '}
                      <strong className="text-slate-600 dark:text-slate-300">never deletes your data</strong>.
                      Re-enable at any time to get it back.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Coming soon */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Coming soon
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🚚', name: 'Delivery', desc: 'Driver dispatch, zones, order tracking' },
            { icon: '🎁', name: 'Loyalty & CRM', desc: 'Points, tiers, birthday rewards' },
            { icon: '🏪', name: 'Multi-Branch', desc: 'Shared inventory across locations' },
          ].map(item => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
