/**
 * Backup Settings Panel
 */

import { useState, useEffect } from 'react'
import { Database, Download, HardDrive, Trash2, RefreshCw, RotateCcw, Clock, MapPin, AlertTriangle, Power, FolderOpen } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import type { BackupSettings } from './types'
import logger from '../../../../shared/utils/logger'

type Backup = {
  filename: string
  path: string
  size: number
  createdAt: string
  missing?: boolean
}

type Props = {
  settings: BackupSettings
  onChange: (settings: BackupSettings) => void
}

export default function BackupSettingsPanel({ settings, onChange }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoringPath, setRestoringPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

  // Backup-on-close preferences (stored in the main process, not localStorage)
  const [promptOnClose, setPromptOnClose] = useState(true)
  const [closeBackupDir, setCloseBackupDir] = useState<string | null>(null)

  const handleChange = (field: keyof BackupSettings, value: boolean | string | number) => {
    onChange({ ...settings, [field]: value })
  }

  // Load backup-on-close prefs once on mount
  useEffect(() => {
    ;(async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('backup:get-close-prefs')
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
      const result = await window.electron.ipcRenderer.invoke('backup:set-close-prefs', next)
      if (!result?.success) {
        toast.error(result?.error || 'Failed to save preference')
      }
    } catch (error) {
      logger.error('Failed to save close-backup prefs:', error)
      toast.error('Failed to save preference')
    }
  }

  const handleTogglePromptOnClose = async () => {
    const next = !promptOnClose
    setPromptOnClose(next)
    await saveClosePrefs({ promptOnClose: next })
  }

  const handleChooseCloseDir = async () => {
    try {
      const dirResult = await window.electron.ipcRenderer.invoke('backup:select-directory')
      if (!dirResult.success) return // user cancelled
      setCloseBackupDir(dirResult.data.path)
      await saveClosePrefs({ backupDir: dirResult.data.path })
      toast.success('Backup folder updated')
    } catch (error) {
      logger.error('Failed to choose folder:', error)
      toast.error('Failed to choose folder')
    }
  }

  // Load all backups from the registry (cross-location)
  const loadBackups = async () => {
    try {
      setLoading(true)
      const result = await window.electron.ipcRenderer.invoke('backup:list')
      if (result.success) {
        setBackups(result.data.backups)
      } else {
        toast.error(result.error || 'Failed to load backups')
      }
    } catch (error) {
      logger.error('Failed to load backups:', error)
      toast.error('Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  // Ask user WHERE to save, then create the backup there
  const handleBackup = async () => {
    try {
      const dirResult = await window.electron.ipcRenderer.invoke('backup:select-directory')
      if (!dirResult.success) return // user cancelled

      setCreating(true)
      toast.info('Creating backup…')

      const result = await window.electron.ipcRenderer.invoke('backup:create', {
        customPath: dirResult.data.path
      })

      if (result.success) {
        toast.success(`Backup saved: ${result.data.filename}`)
        setBackups((prev) => [result.data, ...prev])
      } else {
        toast.error(result.error || 'Failed to create backup')
      }
    } catch (error) {
      logger.error('Backup failed:', error)
      toast.error('Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backupPath: string) => {
    if (!confirm('Are you sure you want to restore from this backup? Your current database will be replaced. The application will need to restart.')) {
      return
    }

    try {
      setRestoringPath(backupPath)
      toast.info('Restoring backup…')

      const result = await window.electron.ipcRenderer.invoke('backup:restore', backupPath)

      if (result.success) {
        toast.success('Backup restored successfully! Please restart the application.')
      } else {
        toast.error(result.error || 'Failed to restore backup')
      }
    } catch (error) {
      logger.error('Restore failed:', error)
      toast.error('Failed to restore backup')
    } finally {
      setRestoringPath(null)
    }
  }

  // Restore from a .db file chosen anywhere on the PC (not just the registry list)
  const handleRestoreFromFile = async () => {
    try {
      const fileResult = await window.electron.ipcRenderer.invoke('backup:select-file')
      if (!fileResult.success) return // user cancelled
      await handleRestore(fileResult.data.path)
    } catch (error) {
      logger.error('Failed to pick backup file:', error)
      toast.error('Failed to select file')
    }
  }

  const handleDeleteBackup = async (backupPath: string) => {
    if (!confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
      return
    }
    try {
      setDeletingPath(backupPath)
      const result = await window.electron.ipcRenderer.invoke('backup:delete', backupPath)

      if (result.success) {
        toast.success('Backup removed')
        setBackups((prev) => prev.filter((b) => b.path !== backupPath))
      } else {
        toast.error(result.error || 'Failed to delete backup')
      }
    } catch (error) {
      logger.error('Delete failed:', error)
      toast.error('Failed to delete backup')
    } finally {
      setDeletingPath(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('backupAndRestore')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('manageBackupRestore')}
        </p>
      </div>

      {/* Create Backup */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{t('manualBackup')}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You will be asked to choose where to save the backup file.
            </p>
          </div>
        </div>

        <button
          onClick={handleBackup}
          disabled={creating}
          className="btn-primary flex items-center gap-2 disabled:opacity-60"
        >
          {creating ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {creating ? 'Creating…' : t('createBackupNow')}
        </button>
      </div>

      {/* Automatic Backup */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/20 text-success rounded-lg flex items-center justify-center">
              <HardDrive size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">{t('automaticBackup')}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('scheduleRegularBackups')}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleChange('autoBackup', !settings.autoBackup)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.autoBackup ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.autoBackup && (
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('backupFrequency')}
              </label>
              <select
                className="input-field"
                value={settings.backupFrequency}
                onChange={(e) => handleChange('backupFrequency', e.target.value)}
              >
                <option value="daily">{t('daily')}</option>
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('numberOfBackupsToKeep')}
              </label>
              <input
                type="number"
                className="input-field max-w-xs"
                value={settings.keepBackups}
                onChange={(e) => handleChange('keepBackups', parseInt(e.target.value) || 7)}
                min="1"
                max="30"
              />
              <p className="text-xs text-slate-500">{t('olderBackupsDeleted')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Backup when closing the app */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <Power size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">
                {t('backupOnClose') || 'Back up when closing the app'}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('backupOnCloseDesc') ||
                  'Ask to save a backup every time you close BizFlow.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePromptOnClose}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              promptOnClose ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                promptOnClose ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {promptOnClose && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('backupFolder') || 'Backup folder'}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800">
                <MapPin size={15} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                  {closeBackupDir || (t('defaultDocumentsFolder') || 'Default (Documents/BizFlow Backups)')}
                </span>
              </div>
              <button
                onClick={handleChooseCloseDir}
                className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm shrink-0"
              >
                <FolderOpen size={15} />
                {t('change') || 'Change'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {t('backupOnCloseHint') ||
                'When you close the app you can choose to save a backup here, quit without one, or cancel.'}
            </p>
          </div>
        )}
      </div>

      {/* All Backups (registry) */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              All Backups{backups.length > 0 && ` (${backups.length})`}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every backup ever created by this app, across all locations
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRestoreFromFile}
              className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
              title="Restore from a backup file saved anywhere on this PC"
            >
              <RotateCcw size={15} />
              {t('restoreFromFile') || 'Restore from file…'}
            </button>
            <button
              onClick={loadBackups}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading backups…</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            <Database size={44} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No backups yet</p>
            <p className="text-sm mt-1">Click "Create Backup Now" to get started</p>
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
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${
                    backup.missing
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {backup.filename}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded px-2 py-0.5">
                      {formatFileSize(backup.size)}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <Clock size={13} className="shrink-0" />
                    <span>{formatDate(backup.createdAt)}</span>
                  </div>

                  {/* Path */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-3">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span className="break-all">{backup.path}</span>
                  </div>

                  {/* Missing file warning */}
                  {backup.missing && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-3 py-2 mb-3">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>File not found on disk — it may have been moved or deleted outside the app.</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {!backup.missing && (
                      <button
                        onClick={() => handleRestore(backup.path)}
                        disabled={isBusy || creating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isRestoring ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        {isRestoring ? 'Restoring…' : 'Restore'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBackup(backup.path)}
                      disabled={isBusy || creating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {isDeleting ? 'Removing…' : backup.missing ? 'Remove from list' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="glass-card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">{t('importantNotes')}</h5>
        <ul className="text-sm text-blue-900 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>{t('backupsIncludeAllData')}</li>
          <li>{t('storeBackupsSafely')}</li>
          <li>{t('testBackupsRegularly')}</li>
          <li>{t('databaseLockedDuringBackup')}</li>
        </ul>
      </div>
    </div>
  )
}

