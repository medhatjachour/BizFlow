/**
 * ModulesSettings
 *
 * Lets the admin enable / disable optional business modules.
 * Changes are persisted immediately via IPC; a relaunch button applies them.
 */

import { useState, useEffect } from 'react'
import { MODULE_REGISTRY, formatLicensePrice, moduleMetaText } from '@/shared/modules'
import { useEnabledModules, useRefreshModules } from '../../hooks/useModuleEnabled'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
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
  orange: {
    ring:  'border-orange-300  dark:border-orange-700',
    bg:    'bg-orange-50        dark:bg-orange-900/20',
    icon:  'bg-orange-100      dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  emerald: {
    ring:  'border-emerald-300  dark:border-emerald-700',
    bg:    'bg-emerald-50        dark:bg-emerald-900/20',
    icon:  'bg-emerald-100      dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
}

const STATUS_BADGE: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  planned: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  future:  'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-400',
}

/** Registry status → the i18n key that names it on screen. */
const STATUS_LABEL_KEY: Record<string, string> = {
  active: 'modsStatusActive',
  planned: 'modsStatusPlanned',
  future: 'modsStatusFuture',
}

export default function ModulesSettings() {
  const { t, language } = useLanguage()
  const toast = useToast()
  const isAr = language === 'ar'
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
      toast.error(t('modsToggleFailed'))
    } finally {
      setSaving(null)
    }
  }

  async function handleRelaunch() {
    setRelaunching(true)
    try {
      await window.api.modules.relaunch()
    } catch (err) {
      // A failed relaunch used to leave the button spinning and disabled forever.
      console.error('Failed to relaunch app', err)
      setRelaunching(false)
      toast.error(t('modsRelaunchFailed'))
    }
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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
          {t('modsTitle')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('modsLead')}</p>
      </div>

      {/* Restart banner */}
      {restartNeeded && (
        <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('modsRestartTitle')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{t('modsRestartBody')}</p>
            </div>
          </div>
          <button
            onClick={handleRelaunch}
            disabled={relaunching}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${relaunching ? 'animate-spin' : ''}`} />
            {relaunching ? t('modsRestarting') : t('modsRestartNow')}
          </button>
        </div>
      )}

      {/* No bundled plugins */}
      {noBundled && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium mb-1">{t('modsNoBundledTitle')}</p>
          <p className="text-sm">{t('modsNoBundledBody')}</p>
        </div>
      )}

      {/* Module cards */}
      <div className="space-y-4">
        {modules.map(mod => {
          const isEnabled = pendingIds.has(mod.id)
          const isSaving = saving === mod.id
          const isExpanded = expanded.has(mod.id)
          const colors = COLOR_MAP[mod.color] ?? COLOR_MAP.blue
          const text = moduleMetaText(mod, isAr)

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
                    <span className="font-semibold text-slate-900 dark:text-white">{text.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[mod.status]}`}>
                      {t(STATUS_LABEL_KEY[mod.status] ?? 'modsStatusActive')}
                    </span>
                    {isEnabled && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        {t('modsActiveBadge')}
                      </span>
                    )}
                    <span
                      title={t('modsPriceHint')}
                      className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {formatLicensePrice(mod.price)}{' '}
                      <span className="opacity-60">{t('modsOneTime')}</span>
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                    {text.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Expand details */}
                  <button
                    onClick={() => toggleExpand(mod.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={t('modsShowDetails')}
                    aria-label={t('modsShowDetails')}
                    aria-expanded={isExpanded}
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
                    {isSaving ? t('modsSaving') : isEnabled ? t('modsDisable') : t('modsEnable')}
                  </button>
                </div>
              </div>

              {/* Expandable detail panel */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Feature list */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      {t('modsIncluded')}
                    </p>
                    <ul className="space-y-1.5">
                      {text.features.map(f => (
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
                      {t('modsDataTables')}
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
                      {t('modsSafetyLead')}{' '}
                      <strong className="text-slate-600 dark:text-slate-300">{t('modsSafetyStrong')}</strong>
                      {t('modsSafetyTail')}
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
          {t('modsComingSoon')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🚚', key: 'Delivery', name: t('modsComingDelivery'), desc: t('modsComingDeliveryDesc') },
            { icon: '🎁', key: 'Loyalty', name: t('modsComingLoyalty'), desc: t('modsComingLoyaltyDesc') },
            { icon: '🏪', key: 'Branch', name: t('modsComingBranch'), desc: t('modsComingBranchDesc') },
          ].map(item => (
            <div
              key={item.key}
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
