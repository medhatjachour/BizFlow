import React from 'react'
import { AlertTriangle, CheckCircle2, Truck, X } from 'lucide-react'
import { Transfer } from '../types'

interface Props {
  transfer: Transfer | null
  targetStatus: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const ConfirmStatusModal: React.FC<Props> = ({
  transfer,
  targetStatus,
  onClose,
  onConfirm
}) => {
  if (!transfer || !targetStatus) return null

  const isReconciling = targetStatus === 'completed'
  const isCancelling = targetStatus === 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isReconciling ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : isCancelling ? (
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isReconciling
                ? 'Reconcile & Receive Inventory'
                : isCancelling
                ? 'Cancel Transfer Dispatch'
                : 'Dispatch Cargo In-Transit'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isReconciling
            ? 'Confirming receipt will atomically deduct quantities from the origin location and credit the destination warehouse stock. This operation will be logged in the permanent audit trail.'
            : isCancelling
            ? 'Are you sure you want to cancel this transfer? The allocated stock will be released back to the origin facility.'
            : 'Marking this transfer as In-Transit indicates that goods have physically departed origin and are moving toward destination.'}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md active:scale-95 transition-all ${
              isReconciling
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : isCancelling
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  )
}