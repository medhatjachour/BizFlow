/**
 * Migration Progress UI Component
 * 
 * Shows real-time progress during database migrations with user-friendly messages
 */

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, Database, AlertTriangle } from 'lucide-react'

type MigrationStatus = 'starting' | 'running' | 'validating' | 'completed' | 'failed' | null

export function MigrationProgress() {
  const [status, setStatus] = useState<MigrationStatus>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check if migration API is available
    if (!window.api?.migration) {
      console.warn('[MigrationUI] Migration API not available')
      return undefined
    }

    const handleMigrationStarting = () => {
      console.log('[MigrationUI] Starting migration...')
      setStatus('starting')
    }

    const handleMigrationRunning = () => {
      console.log('[MigrationUI] Running migration...')
      setStatus('running')
    }

    const handleMigrationValidating = () => {
      console.log('[MigrationUI] Validating migration...')
      setStatus('validating')
    }

    const handleMigrationCompleted = () => {
      console.log('[MigrationUI] Migration completed!')
      setStatus('completed')
      // Auto-hide after 3 seconds
      setTimeout(() => setStatus(null), 3000)
    }

    const handleMigrationFailed = (_event: any, errorMsg: string) => {
      console.error('[MigrationUI] Migration failed:', errorMsg)
      setStatus('failed')
      setError(errorMsg)
    }

    try {
      // Register IPC listeners using migration API
      const unsubscribeStarting = window.api.migration.onStarting(handleMigrationStarting)
      const unsubscribeRunning = window.api.migration.onRunning(handleMigrationRunning)
      const unsubscribeValidating = window.api.migration.onValidating(handleMigrationValidating)
      const unsubscribeCompleted = window.api.migration.onCompleted(handleMigrationCompleted)
      const unsubscribeFailed = window.api.migration.onFailed(handleMigrationFailed)

      // Cleanup
      return () => {
        unsubscribeStarting()
        unsubscribeRunning()
        unsubscribeValidating()
        unsubscribeCompleted()
        unsubscribeFailed()
      }
    } catch (err) {
      console.error('[MigrationUI] Error setting up migration listeners:', err)
      return undefined
    }
  }, [])

  if (!status) return null

  const statusConfig = {
    starting: {
      icon: Database,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      title: 'Preparing Update',
      message: 'Checking database and creating backup...',
      showSpinner: true
    },
    running: {
      icon: Database,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      title: 'Updating Database',
      message: 'Applying schema changes to your database...',
      showSpinner: true
    },
    validating: {
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      title: 'Validating Changes',
      message: 'Verifying data integrity and new schema...',
      showSpinner: true
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      title: 'Update Complete!',
      message: 'Your database has been successfully updated.',
      showSpinner: false
    },
    failed: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      title: 'Update Failed',
      message: error || 'An error occurred during the update.',
      showSpinner: false
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="glass-card p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          {/* Icon */}
          <div className={`flex items-center justify-center mx-auto mb-6 ${config.bgColor} w-20 h-20 rounded-full`}>
            {config.showSpinner ? (
              <Loader2 className={`w-10 h-10 ${config.color} animate-spin`} />
            ) : (
              <Icon className={`w-10 h-10 ${config.color}`} />
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {config.title}
          </h2>

          {/* Message */}
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {config.message}
          </p>

          {/* Warning for running status */}
          {config.showSpinner && (
            <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Please don't close the application
              </p>
            </div>
          )}

          {/* Error details */}
          {status === 'failed' && error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
              <p className="text-xs text-red-700 dark:text-red-300 font-mono break-words">
                {error}
              </p>
            </div>
          )}

          {/* Progress indicator */}
          {config.showSpinner && (
            <div className="mt-6">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
