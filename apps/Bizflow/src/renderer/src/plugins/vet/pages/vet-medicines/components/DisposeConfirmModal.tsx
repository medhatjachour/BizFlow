
import React, { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import type { Batch } from '../types'

interface DisposeConfirmModalProps {
  batch: Batch
  medicineName: string
  unit: string
  busy: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export const DisposeConfirmModal: React.FC<DisposeConfirmModalProps> = ({
  batch,
  medicineName,
  unit,
  busy,
  onConfirm,
  onCancel
}) => {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const lossAmount = batch.quantity * (batch.costPerUnit ?? 0)
  const lotLabel = batch.batchNumber ? ` LOT-${batch.batchNumber}` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {t('vetWriteOffTitle') || 'Write Off Expired Batch'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {medicineName}
              {lotLabel}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {t('vetWriteOffQtyLabel') || 'Quantity to write off'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {batch.quantity} {unit}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {t('vetWriteOffCostUnit') || 'Cost per unit'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ${(batch.costPerUnit ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-red-200 dark:border-red-700 pt-1 mt-1">
            <span className="font-semibold text-red-700 dark:text-red-400">
              {t('vetWriteOffLoss') || 'Loss recorded'}
            </span>
            <span className="font-bold text-red-700 dark:text-red-400">${lossAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            {t('vetWriteOffReason') || 'Reason (optional)'}
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Expired — not administered"
            className={INPUT_BASE_CLS}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
          >
            {t('vetMedCancel') || 'Cancel'}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> {t('vetWriteOff') || 'Write Off'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}