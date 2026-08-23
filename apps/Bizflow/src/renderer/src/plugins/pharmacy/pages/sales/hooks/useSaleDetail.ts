import { useState, useEffect, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { PharmacySale, SaleItem } from '../types'
import { computeOutstanding } from '../utils'

export function useSaleDetail(
  initialSale: PharmacySale,
  toast: any,
  t: (k: string) => string,
  onChanged: () => void
) {
  const [sale, setSale] = useState<PharmacySale>(initialSale)
  const [busy, setBusy] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [refundItemId, setRefundItemId] = useState<string | null>(null)
  const [refundQty, setRefundQty] = useState('')

  const refreshSale = useCallback(async () => {
    try {
      const updated = await pharma()?.sales.getById(initialSale.id)
      if (updated) setSale(updated)
    } catch {
      /* ignore */
    }
  }, [initialSale.id])

  useEffect(() => {
    refreshSale()
  }, [refreshSale])

  const outstanding = computeOutstanding(sale)

  const refundWholeSale = async () => {
    if (!confirm(t('phConfirmRefund') || 'Refund this whole sale and restock all items?')) return
    setBusy(true)
    try {
      await pharma()?.sales.refund(sale.id)
      toast.success(t('phRefunded') || 'Sale refunded successfully')
      onChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Refund failed')
    } finally {
      setBusy(false)
    }
  }

  const refundItem = async (item: SaleItem, qty: number) => {
    setBusy(true)
    try {
      await pharma()?.sales.refundItem(item.id, { quantity: qty })
      toast.success(t('phItemRefunded') || 'Item refunded & restocked')
      await refreshSale()
      setRefundItemId(null)
      setRefundQty('')
      onChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Item refund failed')
    } finally {
      setBusy(false)
    }
  }

  const settlePayment = async (full: boolean) => {
    setBusy(true)
    try {
      await pharma()?.sales.updatePayment(
        sale.id,
        full ? { payFull: true } : { amount: parseFloat(payAmount) }
      )
      toast.success(t('phPaymentRecorded') || 'Payment recorded')
      await refreshSale()
      setIsPaying(false)
      setPayAmount('')
      onChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Payment update failed')
    } finally {
      setBusy(false)
    }
  }

  return {
    sale,
    busy,
    outstanding,
    payAmount,
    setPayAmount,
    isPaying,
    setIsPaying,
    refundItemId,
    setRefundItemId,
    refundQty,
    setRefundQty,
    refundWholeSale,
    refundItem,
    settlePayment,
  }
}