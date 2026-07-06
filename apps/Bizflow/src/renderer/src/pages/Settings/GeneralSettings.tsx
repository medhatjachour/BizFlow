/**
 * GeneralSettings Component
 * Theme and language preferences
 */

import { Sun, Moon, Monitor, Globe, Check, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

interface GeneralSettingsProps {
  theme: string
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  actualTheme: 'light' | 'dark'
  language: string
  onLanguageChange: (lang: 'en' | 'ar') => void
}

export default function GeneralSettings({
  theme,
  onThemeChange,
  actualTheme,
  language,
  onLanguageChange
}: Readonly<GeneralSettingsProps>) {
  const { t } = useLanguage()
  
  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor }
  ]

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' }
  ]

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('appearance')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => onThemeChange(option.value as 'light' | 'dark' | 'system')}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}
                <Icon className="w-8 h-8 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {option.label}
                </p>
              </button>
            )
          })}
        </div>
        {theme === 'system' && (
          <p className="text-sm text-slate-500 mt-2">
            {t('currentlyUsing')}: {actualTheme === 'dark' ? t('dark') : t('light')}
          </p>
        )}
      </div>

      {/* Language Selection */}
      <div>
        <label className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white mb-4">
          <Globe className="w-5 h-5" />
          {t('language')} / اللغة
        </label>
        <div className="grid grid-cols-2 gap-4">
          {languages.map((lang) => {
            const isActive = language === lang.code
            
            return (
              <button
                key={lang.code}
                onClick={() => onLanguageChange(lang.code as 'en' | 'ar')}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}
                <p className="text-xl font-semibold text-slate-900 dark:text-white text-center">
                  {lang.name}
                </p>
              </button>
            )
          })}
        </div>
        <p className="text-sm text-slate-500 mt-3">
          {t('languageWillApply')}
        </p>
      </div>

      {/* Software update */}
      <SoftwareUpdate />
    </div>
  )
}

/** Shows the installed version and lets the user trigger an update check. */
function SoftwareUpdate() {
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!window.api?.updater) return
    window.api.updater.getVersion().then(setVersion).catch(() => {})
    const offs = [
      window.api.updater.on('available', (p) => setStatus(`Update available: v${p?.version} — downloading…`)),
      window.api.updater.on('progress', (p) => setStatus(`Downloading… ${p?.percent ?? 0}%`)),
      window.api.updater.on('downloaded', (p) => setStatus(`v${p?.version} downloaded — restart to install.`)),
      window.api.updater.on('none', () => setStatus('You are on the latest version.')),
      window.api.updater.on('error', (p) => setStatus(`Update error: ${p?.message ?? 'unknown'}`))
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const check = async () => {
    if (!window.api?.updater) {
      setStatus('Updates are only available in the installed app.')
      return
    }
    setChecking(true)
    setStatus('Checking for updates…')
    try {
      const res = await window.api.updater.check()
      if (res.status === 'dev') setStatus('Updates are only available in the installed app.')
      else if (res.status === 'error') setStatus(`Update error: ${res.message ?? 'unknown'}`)
      // 'checking' → live events drive the rest of the status.
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Software update</h3>
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            BizFlow{version ? ` v${version}` : ''}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {status || 'Check whether a newer version is available.'}
          </p>
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[color:var(--accent-contrast)] bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] disabled:opacity-50 transition-colors shrink-0"
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> Check for updates
        </button>
      </div>
    </div>
  )
}
