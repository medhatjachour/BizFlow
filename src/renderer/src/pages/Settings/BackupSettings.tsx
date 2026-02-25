/**
 * Backup Settings Panel
 */

import { useState, useEffect } from 'react'
import { Database, Download, Upload, HardDrive, Trash2, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import type { BackupSettings } from './types'
import logger from '../../../../shared/utils/logger'

type Backup = {
  filename: string
  path: string
  size: number
  createdAt: string
  modifiedAt: string
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
  const [backupDirectory, setBackupDirectory] = useState('')
  
  const handleChange = (field: keyof BackupSettings, value: boolean | string | number) => {
    onChange({ ...settings, [field]: value })
  }

  // Load backups list
  const loadBackups = async () => {
    try {
      setLoading(true)
      const result = await window.electron.ipcRenderer.invoke('backup:list', settings.backupLocation)
      if (result.success) {
        setBackups(result.data.backups)
        setBackupDirectory(result.data.directory)
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

  // Load backups on mount and when backup location changes
  useEffect(() => {
    loadBackups()
  }, [settings.backupLocation])

  const handleBackup = async () => {
    try {
      setLoading(true)
      toast.info('Creating backup...')
      
      const result = await window.electron.ipcRenderer.invoke('backup:create', {
        customPath: settings.backupLocation
      })
      
      if (result.success) {
        toast.success(`Backup created successfully: ${result.data.filename}`)
        await loadBackups()
        
        // Clean old backups if auto-cleanup is enabled
        if (settings.autoBackup && settings.keepBackups) {
          await window.electron.ipcRenderer.invoke('backup:clean', {
            keepCount: settings.keepBackups,
            customPath: settings.backupLocation
          })
          await loadBackups()
        }
      } else {
        toast.error(result.error || 'Failed to create backup')
      }
    } catch (error) {
      logger.error('Backup failed:', error)
      toast.error('Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreClick = async () => {
    // Open file dialog to select backup file
    const result = await window.electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Backup File',
      filters: [{ name: 'Database Backup', extensions: ['db'] }],
      properties: ['openFile']
    })

    if (result && result.length > 0) {
      await handleRestore(result[0])
    }
  }

  const handleRestore = async (backupPath: string) => {
    if (!confirm('Are you sure you want to restore from this backup? Your current database will be replaced.')) {
      return
    }
    
    try {
      setLoading(true)
      toast.info('Restoring backup...')
      
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
      setLoading(false)
    }
  }

  const handleDeleteBackup = async (backupPath: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return
    }
    
    try {
      const result = await window.electron.ipcRenderer.invoke('backup:delete', backupPath)
      
      if (result.success) {
        toast.success('Backup deleted successfully')
        await loadBackups()
      } else {
        toast.error(result.error || 'Failed to delete backup')
      }
    } catch (error) {
      logger.error('Delete failed:', error)
      toast.error('Failed to delete backup')
    }
  }

  const handleSelectLocation = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('backup:select-directory')
      
      if (result.success) {
        handleChange('backupLocation', result.data.path)
        toast.success('Backup location updated')
      }
    } catch (error) {
      logger.error('Failed to select directory:', error)
      toast.error('Failed to select directory')
    }
  }
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString()
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

      {/* Manual Backup/Restore */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
            <Database size={20} />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white">{t('manualBackup')}</h4>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('createBackupProtect')}
        </p>

        <div className="flex gap-3">
          <button onClick={handleBackup} className="btn-primary flex items-center gap-2">
            <Download size={18} />
            {t('createBackupNow')}
          </button>
          <button onClick={handleRestoreClick} className="btn-secondary flex items-center gap-2">
            <Upload size={18} />
            {t('restoreFromBackup')}
          </button>
        </div>
      </div>

      {/* Automatic Backup */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
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
          <div className="space-y-4">
            {/* Backup Frequency */}
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

            {/* Backup Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('backupLocation')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  value={settings.backupLocation || t('defaultLocation')}
                  onChange={(e) => handleChange('backupLocation', e.target.value)}
                  placeholder={t('selectBackupFolder')}
                  readOnly
                />
                <button onClick={handleSelectLocation} className="btn-secondary px-4">
                  {t('browse')}
                </button>
              </div>
            </div>

            {/* Keep Backups */}
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
              <p className="text-xs text-slate-500">
                {t('olderBackupsDeleted')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Backup List */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            Available Backups ({backups.length})
          </h4>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 px-3 py-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        
        {backupDirectory && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Location: {backupDirectory}
          </p>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Database size={48} className="mx-auto mb-3 opacity-50" />
            <p>No backups found</p>
            <p className="text-sm mt-2">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.path}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {backup.filename}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {formatDate(backup.createdAt)} • {formatFileSize(backup.size)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(backup.path)}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.path)}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
