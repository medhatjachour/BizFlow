import { useCallback, useState } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import {
  getSaleCompletionDelayDays,
  setSaleCompletionDelayDays
} from '../completionSettings'

export function useSaleCompletion(onChanged: () => Promise<void>) {
  const { showToast } = useToast()
  const { t } = useLanguage()
  const [defaultDelayDays, setDefaultDelayDaysState] = useState(
    getSaleCompletionDelayDays
  )
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const runUpdate = useCallback(
    async (transactionId: string, operation: () => Promise<any>, successMessage: string) => {
      setUpdatingIds((current) => new Set(current).add(transactionId))
      try {
        const result = await operation()
        if (!result?.success) throw new Error(result?.error || t('salesUiUpdateFailed'))
        showToast('success', successMessage)
        await onChanged()
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : t('salesUiUpdateFailed'))
      } finally {
        setUpdatingIds((current) => {
          const next = new Set(current)
          next.delete(transactionId)
          return next
        })
      }
    },
    [onChanged, showToast, t]
  )

  const completeNow = useCallback(
    (transactionId: string) =>
      runUpdate(
        transactionId,
        () => ipc.saleTransactions.complete(transactionId),
        t('salesUiCompletedSuccess')
      ),
    [runUpdate, t]
  )

  const reschedule = useCallback(
    (transactionId: string, delayDays: number) =>
      runUpdate(
        transactionId,
        () => ipc.saleTransactions.rescheduleCompletion({ transactionId, delayDays }),
        t('salesUiRescheduledSuccess', { days: delayDays })
      ),
    [runUpdate, t]
  )

  const updateDefaultDelay = useCallback((value: number) => {
    const delayDays = setSaleCompletionDelayDays(value)
    setDefaultDelayDaysState(delayDays)
  }, [])

  return {
    defaultDelayDays,
    updatingIds,
    completeNow,
    reschedule,
    updateDefaultDelay
  }
}
