import { useState, useEffect, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { CustomerProfileData } from '../types'

export function useCustomerProfile(
  customerId: string,
  toast: any,
  t: (k: string, params?: Record<string, any>) => string,
  onChanged: () => void
) {
  const [data, setData] = useState<CustomerProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pharma()?.customers.profile(customerId)
      setData(res ?? null)
    } catch (err: any) {
      toast.error(err?.message || t('phCuLoadProfileFailed'))
    } finally {
      setLoading(false)
    }
  }, [customerId, toast])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const executeSettle = async (full: boolean) => {
    setBusy(true)
    try {
      const res = await pharma()?.customers.settle(
        customerId,
        full ? {} : { amount: parseFloat(payAmount) }
      )
      toast.success(
        t('phSettled') + ' ' + t('phCuSettledAcross', { amount: `$${(res?.applied || 0).toFixed(2)}`, count: res?.settledCount ?? 0 })
      )
      setSettling(false)
      setPayAmount('')
      await loadProfile()
      onChanged()
    } catch (err: any) {
      toast.error(err?.message || t('phCuSettleFailed'))
    } finally {
      setBusy(false)
    }
  }

  return {
    data,
    loading,
    settling,
    payAmount,
    busy,
    setSettling,
    setPayAmount,
    executeSettle,
    reload: loadProfile,
  }
}