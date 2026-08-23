import { useState, useEffect, useMemo } from 'react'
import { pharma } from '../../components/_shared'
import { PurchaseOrderItem, POLineItem, SupplierItem } from '../types'
import { createBlankPOLine } from '../utils'

export function usePurchaseOrderForm(
  order: PurchaseOrderItem | null,
  toast: any,
  t: (k: string) => string,
  onSaved: () => void
) {
  const [busy, setBusy] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [status, setStatus] = useState<'draft' | 'ordered'>(
    order?.status === 'ordered' ? 'ordered' : 'draft'
  )
  const [lines, setLines] = useState<POLineItem[]>([createBlankPOLine()])

  useEffect(() => {
    pharma()?.suppliers.getAll().then((res: any) => setSuppliers(res?.data ?? res ?? [])).catch(() => {})
    pharma()?.products.getAll({ status: 'active', take: 1000 }).then((r: any) => setProducts(r?.data ?? [])).catch(() => {})

    if (order?.id) {
      pharma()?.purchaseOrders.getById(order.id).then((full: any) => {
        if (!full) return
        setSupplierId(full.supplierId || '')
        setNotes(full.notes || '')
        setStatus(full.status === 'ordered' ? 'ordered' : 'draft')
        if (full.items && full.items.length > 0) {
          setLines(
            full.items.map((it: any) => ({
              id: it.id,
              productId: it.productId ?? '',
              productName: it.productName,
              quantity: String(it.quantity),
              costPerUnit: String(it.costPerUnit),
              sellingPrice: it.sellingPrice != null ? String(it.sellingPrice) : '',
              expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().slice(0, 10) : '',
            }))
          )
        }
      }).catch(() => {})
    }
  }, [order?.id])

  const setLine = (index: number, patch: Partial<POLineItem>) => {
    setLines(prev => prev.map((line, idx) => (idx === index ? { ...line, ...patch } : line)))
  }

  const pickProduct = (index: number, productId: string) => {
    const p = products.find(x => x.id === productId)
    setLine(index, {
      productId,
      productName: p?.name ?? '',
      sellingPrice: p?.sellingPrice != null ? String(p.sellingPrice) : '',
    })
  }

  const addLine = () => setLines(prev => [...prev, createBlankPOLine()])
  const removeLine = (index: number) => setLines(prev => prev.filter((_, idx) => idx !== index))

  const totalCalculated = useMemo(() => {
    return lines.reduce((acc, l) => {
      const q = parseFloat(l.quantity) || 0
      const c = parseFloat(l.costPerUnit) || 0
      return acc + q * c
    }, 0)
  }, [lines])

  const submit = async () => {
    const validItems = lines
      .filter(l => l.productName.trim() && parseFloat(l.quantity) > 0)
      .map(l => ({
        productId: l.productId || undefined,
        productName: l.productName,
        quantity: parseFloat(l.quantity),
        costPerUnit: parseFloat(l.costPerUnit) || 0,
        sellingPrice: l.sellingPrice ? parseFloat(l.sellingPrice) : undefined,
        expiryDate: l.expiryDate || undefined,
      }))

    if (validItems.length === 0) {
      toast.error(t('phAddOneItem') || 'Please add at least one line item')
      return
    }

    setBusy(true)
    try {
      const payload = {
        supplierId: supplierId || undefined,
        notes,
        status,
        items: validItems,
      }

      if (order?.id) {
        await pharma()?.purchaseOrders.update(order.id, payload)
        toast.success(t('phOrderUpdated') || 'Purchase order updated')
      } else {
        await pharma()?.purchaseOrders.create(payload)
        toast.success(t('phOrderCreated') || 'Purchase order created')
      }

      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return {
    suppliers,
    products,
    supplierId,
    notes,
    status,
    lines,
    totalCalculated,
    busy,
    setSupplierId,
    setNotes,
    setStatus,
    setLine,
    pickProduct,
    addLine,
    removeLine,
    submit,
  }
}