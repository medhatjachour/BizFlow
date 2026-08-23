import { useState, useEffect, useCallback, useRef } from 'react'
import { pharma } from '../../components/_shared'
import { PurchaseOrderItem } from '../types'

export function useReceiveVerification(
  order: PurchaseOrderItem,
  toast: any,
  t: (k: string) => string,
  onReceived: () => void
) {
  const [items, setItems] = useState<any[]>([])
  const [scannedCounts, setScannedCounts] = useState<Record<string, number>>({})
  const [barcodeQuery, setBarcodeQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const inputScanRef = useRef<HTMLInputElement>(null)

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => inputScanRef.current?.focus())
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const full = await pharma()?.purchaseOrders.getById(order.id)
        setItems(full?.items ?? [])
      } catch {
        toast.error(t('phFailedLoad') || 'Failed to load purchase order line items')
      } finally {
        setLoading(false)
        focusScanner()
      }
    })()
  }, [order.id, toast, t, focusScanner])

  const orderedQtyFor = (it: any) => Number(it.quantity) || 0
  const scannedQtyFor = (it: any) => scannedCounts[it.id] ?? 0

  const linesVerifiedCount = items.filter(it => scannedQtyFor(it) >= orderedQtyFor(it)).length
  const isFullyVerified = items.length > 0 && linesVerifiedCount === items.length

  const adjustScanned = (it: any, delta: number) => {
    setScannedCounts(prev => {
      const current = prev[it.id] ?? 0
      const next = Math.max(0, current + delta)
      return { ...prev, [it.id]: next }
    })
  }

  const handleScanBarcode = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = barcodeQuery.trim()
    if (!code) return
    setBarcodeQuery('')

    let matchedProduct: any = null
    try {
      const res = await pharma()?.products.getAll({ search: code, take: 5 })
      const list: any[] = res?.data ?? []
      matchedProduct = list.find(p => p.barcode === code) ?? null
    } catch {
      /* ignore */
    }

    if (!matchedProduct) {
      toast.error(`${t('phUnknownBarcode') || 'Unrecognized barcode'}: ${code}`)
      focusScanner()
      return
    }

    const matchedLine = items.find(it => it.productId && it.productId === matchedProduct.id)
    if (!matchedLine) {
      toast.error(`${matchedProduct.name} — ${t('phNotInOrder') || 'not in this purchase order'}`)
      focusScanner()
      return
    }

    adjustScanned(matchedLine, 1)
    focusScanner()
  }

  const commitReceiveIntoStock = async () => {
    setBusy(true)
    try {
      const res = await pharma()?.purchaseOrders.receive(order.id)
      toast.success(
        `${t('phReceived') || 'Stock received'} · ${res?.createdBatches ?? items.length} batches created`
      )
      onReceived()
    } catch (err: any) {
      toast.error(err?.message || 'Receiving failed')
    } finally {
      setBusy(false)
    }
  }

  return {
    items,
    barcodeQuery,
    loading,
    busy,
    linesVerifiedCount,
    isFullyVerified,
    inputScanRef,
    setBarcodeQuery,
    orderedQtyFor,
    scannedQtyFor,
    adjustScanned,
    handleScanBarcode,
    commitReceiveIntoStock,
    focusScanner,
  }
}