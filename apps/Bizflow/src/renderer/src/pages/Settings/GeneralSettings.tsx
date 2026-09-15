/**
 * GeneralSettings Component
 * Theme and language preferences
 */

import { Sun, Moon, Monitor, Globe, Check, RefreshCw, Download, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import LicenseActivation from './LicenseActivation'

/**
 * Colour by meaning, not by decoration: "up to date" and "downloaded" are good
 * news, an error is bad news, and work in progress uses the accent so it reads
 * as activity rather than a warning.
 */
const STATUS_TONE: Record<string, string> = {
  updUpToDate: 'text-emerald-600 dark:text-emerald-400',
  updDownloaded: 'text-emerald-600 dark:text-emerald-400',
  updAvailable: 'text-[color:var(--accent)]',
  updDownloading: 'text-[color:var(--accent)]',
  updChecking: 'text-[color:var(--accent)]',
  updError: 'text-rose-600 dark:text-rose-400'
}

interface GeneralSettingsProps {
  theme: string
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  actualTheme: 'light' | 'dark'
  language: string
  onLanguageChange: (lang: 'en' | 'ar') => void
  /** Jumps to the Modules tab — offered by the licence panel's module grid. */
  onOpenModules?: () => void
}

export default function GeneralSettings({
  theme,
  onThemeChange,
  actualTheme,
  language,
  onLanguageChange,
  onOpenModules
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

      {/* Licence — trial countdown, Device ID and activation steps. The panel
          was written for this exact spot but was never mounted, so there was no
          way to find out how to activate from inside the app. */}
      <LicenseActivation onOpenModules={onOpenModules} />

      {/* Software update */}
      <SoftwareUpdate />
    </div>
  )
}

/**
 * Shows the installed version and lets the user trigger an update check.
 *
 * A download runs in the background for minutes, so the card has to say more
 * than "downloading": it shows real progress, colours the status by what it
 * means (up to date / in progress / failed) and, once the download has landed,
 * offers the restart that actually installs it — the user who answered "Later"
 * to the modal otherwise had no way back to that decision.
 */
function SoftwareUpdate() {
  const { t } = useLanguage()
  const [version, setVersion] = useState('')
  const [statusKey, setStatusKey] = useState<string | null>(null)
  const [statusParams, setStatusParams] = useState<Record<string, string | number>>()
  const [percent, setPercent] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  // Held apart from the status line: the line keeps changing (a later manual
  // check reports "up to date"), but the offer to restart must not vanish with it.
  const [readyVersion, setReadyVersion] = useState<string | null>(null)
  // Same value as `readyVersion`, readable from an event handler that was
  // subscribed once — the closures below never see a later render's state.
  const readyRef = useRef<string | null>(null)

  const setStatus = (key: string | null, params?: Record<string, string | number>) => {
    setStatusKey(key)
    setStatusParams(params)
  }

  useEffect(() => {
    if (!window.api?.updater) return
    window.api.updater.getVersion().then(setVersion).catch(() => {})
    const offs = [
      window.api.updater.on('available', (p) => {
        setPercent(0)
        setStatus('updAvailable', { version: p?.version ?? '' })
      }),
      window.api.updater.on('progress', (p) => {
        setPercent(p?.percent ?? 0)
        setStatus('updDownloading', { percent: p?.percent ?? 0 })
      }),
      window.api.updater.on('downloaded', (p) => {
        setPercent(null)
        readyRef.current = p?.version ?? ''
        setReadyVersion(readyRef.current)
        setStatus('updDownloaded', { version: readyRef.current })
      }),
      window.api.updater.on('none', () => {
        setPercent(null)
        // A build is already staged, so "you are on the latest version" is false
        // and it used to print directly above "restart and install". Re-stating
        // the staged build also clears the "checking…" line the button set, which
        // otherwise sat there looking like a hung check.
        if (readyRef.current !== null) setStatus('updDownloaded', { version: readyRef.current })
        else setStatus('updUpToDate')
      }),
      window.api.updater.on('error', (p) => {
        setPercent(null)
        setStatus('updError', { message: p?.message || t('updUnknownError') })
      })
    ]
    return () => offs.forEach((off) => off())
    // `t` is stable per language; re-subscribing on language change keeps the
    // error text in the language the user is currently reading.
  }, [t])

  const check = async () => {
    if (!window.api?.updater) {
      setStatus('updDevOnly')
      return
    }
    setChecking(true)
    setStatus('updChecking')
    try {
      const res = await window.api.updater.check()
      if (res.status === 'dev') setStatus('updDevOnly')
      else if (res.status === 'error') {
        setStatus('updError', { message: res.message || t('updUnknownError') })
      }
      // 'checking' → live events drive the rest of the status.
    } finally {
      setChecking(false)
    }
  }

  const install = async () => {
    setInstalling(true)
    try {
      const res = await window.api.updater.install()
      // On success the app is already quitting; only a refusal lands back here.
      if (!res?.ok) {
        setStatus('updDevOnly')
        setInstalling(false)
      }
    } catch {
      setStatus('updError', { message: t('updUnknownError') })
      setInstalling(false)
    }
  }

  const statusText = statusKey ? t(statusKey, statusParams) : t('updIdle')

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('updTitle')}</h3>
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('updInstalledVersion')}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              {/* The brand and the version are Latin in both languages; `dir` keeps
                  them from being reordered inside an RTL paragraph. */}
              <span dir="ltr">{t('updVersionValue', { version: version || '—' })}</span>
            </p>
            <p
              role="status"
              aria-live="polite"
              className={`text-xs mt-1 ${STATUS_TONE[statusKey ?? ''] ?? 'text-slate-500 dark:text-slate-400'}`}
            >
              {statusText}
            </p>
          </div>
          <button
            onClick={check}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[color:var(--accent-contrast)] bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] disabled:opacity-50 transition-colors shrink-0"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {t('updCheckButton')}
          </button>
        </div>

        {percent !== null ? (
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('updTitle')}
          >
            <div
              className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        ) : null}

        {readyVersion !== null ? (
          <button
            type="button"
            onClick={install}
            disabled={installing}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {installing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {t('updRestartButton')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
