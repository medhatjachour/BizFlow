import { useState } from 'react'
import { AlertTriangle, Archive, Trash2, Info, X } from 'lucide-react'
import logger from '../../../shared/utils/logger'

interface DeleteCheckResult {
  canDelete: boolean
  dependencies?: {
    transactions?: number
    sales?: number
    stock?: number
    refunds?: number
    variants?: number
  }
  message: string
  suggestedAction: 'DELETE' | 'ARCHIVE' | 'CANCEL'
}

interface SmartDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  entityType: 'customer' | 'product' | 'user'
  entityName: string
  checkResult: DeleteCheckResult | null
  onDelete: () => Promise<void>
  onArchive: (reason?: string) => Promise<void>
}

export default function SmartDeleteDialog({
  isOpen,
  onClose,
  entityType,
  entityName,
  checkResult,
  onDelete,
  onArchive
}: SmartDeleteDialogProps) {
  const [archiveReason, setArchiveReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !checkResult) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      logger.error('Delete failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    setLoading(true)
    try {
      await onArchive(archiveReason || undefined)
      onClose()
      setArchiveReason('')
    } catch (error) {
      logger.error('Archive failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const entityTypeLabel = entityType === 'user' ? 'User' : entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            {checkResult.canDelete ? (
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
            )}
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {checkResult.canDelete ? 'Confirm Deletion' : 'Cannot Delete'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {entityTypeLabel}: <span className="font-semibold">{entityName}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Message */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {checkResult.message}
            </p>
            
            {/* Dependencies */}
            {checkResult.dependencies && Object.keys(checkResult.dependencies).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Dependencies Found:
                </p>
                <ul className="space-y-1">
                  {checkResult.dependencies.transactions !== undefined && checkResult.dependencies.transactions > 0 && (
                    <li className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      {checkResult.dependencies.transactions} transaction(s)
                    </li>
                  )}
                  {checkResult.dependencies.sales !== undefined && checkResult.dependencies.sales > 0 && (
                    <li className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      {checkResult.dependencies.sales} sale(s)
                    </li>
                  )}
                  {checkResult.dependencies.stock !== undefined && checkResult.dependencies.stock > 0 && (
                    <li className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      {checkResult.dependencies.stock} items in stock
                    </li>
                  )}
                  {checkResult.dependencies.variants !== undefined && checkResult.dependencies.variants > 0 && (
                    <li className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      {checkResult.dependencies.variants} variant(s)
                    </li>
                  )}
                  {checkResult.dependencies.refunds !== undefined && checkResult.dependencies.refunds > 0 && (
                    <li className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      {checkResult.dependencies.refunds} refund(s)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Archive Option */}
          {!checkResult.canDelete && checkResult.suggestedAction === 'ARCHIVE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {entityType === 'user' ? 'Deactivation' : 'Archive'} Reason (Optional)
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder={
                  entityType === 'product' 
                    ? "e.g., No longer selling this product, Discontinued, Out of season..." 
                    : entityType === 'customer'
                    ? "e.g., Duplicate account, Inactive customer, Moved away..."
                    : "e.g., Employee left, End of contract, Temporary suspension..."
                }
                disabled={loading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 font-medium transition-colors"
          >
            Cancel
          </button>
          
          {/* Archive (if can't delete) */}
          {!checkResult.canDelete && checkResult.suggestedAction === 'ARCHIVE' && (
            <button
              onClick={handleArchive}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
              {entityType === 'user' ? 'Deactivate' : 'Archive'} Instead
            </button>
          )}
          
          {/* Delete (if allowed) */}
          {checkResult.canDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              Permanently Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
