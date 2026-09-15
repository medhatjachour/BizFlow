/**
 * Backup & Restore Settings Panel
 * Enterprise-grade backup registry with automated close-backup preferences and modal confirmations
 */

import  { useState, useEffect, useCallback } from 'react'
import {
  Database,
  Download,
  HardDrive,
  Trash2,
  RefreshCw,
  RotateCcw,
  Clock,
  MapPin,
  AlertTriangle,
  Power,
  FolderOpen,
  ShieldAlert,
  FileCheck,
  FileX
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import { formatDateTime } from '../../lib/format'
import type { BackupSettings } from './types'
import logger from '../../../../shared/utils/logger'

interface Backup {
  filename: string
  path: string
  size: number
  createdAt: string
  missing?: boolean
}

interface BackupSettingsProps {
  settings: BackupSettings
  onChange: (settings: BackupSettings) => void
}



export default function BackupSettingsPanel({
  settings,
  onChange
}: Readonly<BackupSettingsProps>) {
  const { t, language } = useLanguage()
  const toast = useToast()

  // Screen copy comes from the dictionaries (i18n/*.part.16.ts); this object only
  // keeps the JSX readable.
  

  // Component States
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoringPath, setRestoringPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  // Backup-on-close preferences
  const [promptOnClose, setPromptOnClose] = useState(true)
  const [closeBackupDir, setCloseBackupDir] = useState<string | null>(null)

  // Modal Dialog States
  const [restoreModalBackup, setRestoreModalBackup] = useState<Backup | null>(null)
  const [deleteModalBackup, setDeleteModalBackup] = useState<Backup | null>(null)

  // IPC Safe Wrapper
  const invokeIPC = async (channel: string, ...args: any[]) => {
    if (window.electron?.ipcRenderer?.invoke) {
      return await window.electron.ipcRenderer.invoke(channel, ...args)
    }

    throw new Error('Electron IPC bridge is unavailable')
  }

  // Settings updater
  const handleSettingChange = (field: keyof BackupSettings, value: boolean | string | number) => {
    onChange({ ...settings, [field]: value })
  }

  // Load close-backup preferences
  useEffect(() => {
    ;(async () => {
      try {
        const result = await invokeIPC('backup:get-close-prefs')
        if (result?.success) {
          setPromptOnClose(result.data.promptOnClose !== false)
          setCloseBackupDir(result.data.backupDir ?? null)
        }
      } catch (error) {
        logger.error('Failed to load close-backup prefs:', error)
      }
    })()
  }, [])

  const saveClosePrefs = async (next: { promptOnClose?: boolean; backupDir?: string | null }) => {
    try {
      const result = await invokeIPC('backup:set-close-prefs', next)
      if (!result?.success) {
        toast.error(result?.error || t('bkSaveFailed'))
      }
    } catch (error) {
      logger.error('Failed to save close-backup prefs:', error)
      toast.error(t('bkSaveFailed'))
    }
  }

  const handleTogglePromptOnClose = async () => {
    const next = !promptOnClose
    setPromptOnClose(next)
    await saveClosePrefs({ promptOnClose: next })
  }

  const handleChooseCloseDir = async () => {
    try {
      const dirResult = await invokeIPC('backup:select-directory')
      if (!dirResult?.success) return
      setCloseBackupDir(dirResult.data.path)
      await saveClosePrefs({ backupDir: dirResult.data.path })
      toast.success(t('bkFolderUpdated'))
    } catch (error) {
      logger.error('Failed to choose folder:', error)
      toast.error(t('bkChooseFailed'))
    }
  }

  // Load registered backups
  const loadBackups = useCallback(async () => {
    try {
      setLoading(true)
      const result = await invokeIPC('backup:list')
      if (result?.success) {
        setBackups(result.data.backups || [])
      } else {
        toast.error(result?.error || t('bkLoadFailed'))
      }
    } catch (error) {
      logger.error('Failed to load backups:', error)
      toast.error(t('bkLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  // Create Manual Backup
  const handleBackup = async () => {
    try {
      const dirResult = await invokeIPC('backup:select-directory')
      if (!dirResult?.success) return

      setCreating(true)
      toast.info(t('bkCreating'))

      const result = await invokeIPC('backup:create', {
        customPath: dirResult.data.path
      })

      if (result?.success) {
        toast.success(t('bkCreated', { name: result.data.filename }))
        setBackups((prev) => [result.data, ...prev])
      } else {
        toast.error(result?.error || t('bkCreateFailed'))
      }
    } catch (error) {
      logger.error('Backup failed:', error)
      toast.error(t('bkCreateFailed'))
    } finally {
      setCreating(false)
    }
  }

  // Execute Restore
  const executeRestore = async (backupPath: string) => {
    try {
      setRestoringPath(backupPath)
      setRestoreModalBackup(null)
      toast.info(t('bkRestoring'))

      const result = await invokeIPC('backup:restore', backupPath)
      if (result?.success) {
        toast.success(t('bkRestored'))
      } else {
        toast.error(result?.error || t('bkRestoreFailed'))
      }
    } catch (error) {
      logger.error('Restore failed:', error)
      toast.error(t('bkRestoreFailed'))
    } finally {
      setRestoringPath(null)
    }
  }

  // Pick external DB file to restore
  const handleRestoreFromFile = async () => {
    try {
      const fileResult = await invokeIPC('backup:select-file')
      if (!fileResult?.success) return
      setRestoreModalBackup({
        filename: fileResult.data.path.split(/[\\/]/).pop() || 'Selected Database',
        path: fileResult.data.path,
        size: 0,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to pick backup file:', error)
      toast.error(t('bkSelectFailed'))
    }
  }

  // Execute Delete
  const executeDelete = async (backupPath: string) => {
    try {
      setDeletingPath(backupPath)
      setDeleteModalBackup(null)

      const result = await invokeIPC('backup:delete', backupPath)
      if (result?.success) {
        toast.success(t('bkRemoved'))
        setBackups((prev) => prev.filter((b) => b.path !== backupPath))
      } else {
        toast.error(result?.error || t('bkDeleteFailed'))
      }
    } catch (error) {
      logger.error('Delete failed:', error)
      toast.error(t('bkDeleteFailed'))
    } finally {
      setDeletingPath(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (dateString: string): string =>
    formatDateTime(dateString, language, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Database className="w-5 h-5 text-primary" />
          <span>{t('backupAndRestore')}</span>
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('manageBackupRestore')}
        </p>
      </div>

      {/* 1. Create Manual Backup */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {t('manualBackup')}
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('bkManualDesc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackup}
          disabled={creating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
        >
          {creating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{creating ? t('bkCreating') : t('createBackupNow')}</span>
        </button>
      </div>

      {/* 2. Automated Scheduled Backup */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 me-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                {t('automaticBackup')}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('scheduleRegularBackups')}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={Boolean(settings.autoBackup)}
            onClick={() => handleSettingChange('autoBackup', !settings.autoBackup)}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.autoBackup ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.autoBackup ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {settings.autoBackup && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/80 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('backupFrequency')}
              </label>
              <select
                value={settings.backupFrequency || 'daily'}
                onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="daily">{t('daily')}</option>
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('numberOfBackupsToKeep')}
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.keepBackups || 7}
                onChange={(e) =>
                  handleSettingChange(
                    'keepBackups',
                    Math.max(1, parseInt(e.target.value, 10) || 7)
                  )
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="block text-xs text-slate-400 mt-1">{t('olderBackupsDeleted')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Backup on App Close */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 me-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Power className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                {t('bkCloseTitle')}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t('bkCloseDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={promptOnClose}
            onClick={handleTogglePromptOnClose}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              promptOnClose ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                promptOnClose ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {promptOnClose && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 space-y-2 animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('bkCloseFolderLabel')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate" dir="ltr">
                  {closeBackupDir || t('bkCloseFolderDefault')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleChooseCloseDir}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-primary" />
                <span>{t('change')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. All Backups Registry List */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              {t('bkHistoryTitle')} ({backups.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('bkHistorySubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreFromFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('bkRestoreFromFile')}</span>
            </button>
            <button
              type="button"
              onClick={loadBackups}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('bkRefresh')}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <RefreshCw className="w-7 h-7 animate-spin text-primary mb-2" />
            <p className="text-xs font-medium">{t('bkCreating')}</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8">
            <Database className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              {t('bkNoBackupsTitle')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t('bkNoBackupsSubtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup, index) => {
              const isRestoring = restoringPath === backup.path
              const isDeleting = deletingPath === backup.path
              const isBusy = isRestoring || isDeleting

              return (
                <div
                  key={backup.path}
                  className={`p-4 rounded-xl border transition-all ${
                    backup.missing
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      {backup.missing ? (
                        <FileX className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate" dir="ltr">
                        {backup.filename}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                      {formatFileSize(backup.size)}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(backup.createdAt)}</span>
                    </div>
                  </div>

                  {/* File Path */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-3" dir="ltr">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                    <span className="break-all">{backup.path}</span>
                  </div>

                  {/* Missing File Warning Banner */}
                  {backup.missing && (
                    <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/30 rounded-lg p-2.5 mb-3">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{t('bkMissingFile')}</span>
                    </div>
                  )}

                  {/* Item Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    {!backup.missing && (
                      <button
                        type="button"
                        onClick={() => setRestoreModalBackup(backup)}
                        disabled={isBusy || creating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isRestoring ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{isRestoring ? t('bkRestoring') : t('bkRestore')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteModalBackup(backup)}
                      disabled={isBusy || creating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isDeleting
                          ? t('bkDeleting')
                          : backup.missing
                          ? t('bkRemoveMissing')
                          : t('bkDelete')}
                      </span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Security Info Card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80">
        <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            {t('importantNotes')}
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
            <li>{t('backupsIncludeAllData') || 'Backups contain full database tables, sales history, inventory, and user privileges.'}</li>
            <li>{t('storeBackupsSafely') || 'Keep backup files stored securely on an external drive or cloud storage.'}</li>
            <li>{t('databaseLockedDuringBackup') || 'Active write operations are safely paused during backup creation.'}</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal: Restore Database */}
      {restoreModalBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('bkConfirmRestoreTitle')}
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('bkConfirmRestoreDesc')}
            </p>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 break-all" dir="ltr">
              {restoreModalBackup.filename}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalBackup(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => executeRestore(restoreModalBackup.path)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('bkRestore')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Backup */}
      {deleteModalBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('bkConfirmDeleteTitle')}
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('bkConfirmDeleteDesc')}
            </p>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 break-all" dir="ltr">
              {deleteModalBackup.filename}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalBackup(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => executeDelete(deleteModalBackup.path)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('bkDelete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}