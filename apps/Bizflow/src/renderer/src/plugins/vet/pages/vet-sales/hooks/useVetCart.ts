import { useState, useCallback, useMemo } from 'react'
import type { CartItem, MedicineLite, BatchLite } from '../types'
import { roundDecimal } from '../utils'

export function useVetCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const getCommittedBatchQty = useCallback(
    (batchId: string, targetUnit: 'container' | 'sub', subRatio = 1, excludeItemId?: string | null) => {
      return cart
        .filter(ci => ci.batch.id === batchId && ci.id !== excludeItemId)
        .reduce((sum, ci) => {
          const q = parseFloat(ci.quantity) || 0
          const ratio = ci.medicine.subUnitsPerContainer || 1
          if (ci.saleUnit === targetUnit) return sum + q
          if (targetUnit === 'sub' && ci.saleUnit === 'container') return sum + q * ratio
          if (targetUnit === 'container' && ci.saleUnit === 'sub') return sum + q / ratio
          return sum + q
        }, 0)
    },
    [cart]
  )

  const quickAdd = useCallback((med: MedicineLite, batch: BatchLite): boolean => {
    const ratio = med.subUnitsPerContainer ?? 1
    const committed = cart
      .filter(ci => ci.batch.id === batch.id)
      .reduce((s, ci) => {
        const q = parseFloat(ci.quantity) || 0
        return s + (ci.saleUnit === 'sub' ? q / ratio : q)
      }, 0)

    if (batch.quantity - committed < 1 - 1e-9) {
      return false
    }

    const price = String((batch.sellingPrice ?? batch.costPerUnit) || 0)
    const existing = cart.find(ci => ci.batch.id === batch.id && ci.saleUnit === 'container')

    if (existing) {
      const nextQty = (parseFloat(existing.quantity) || 0) + 1
      setCart(prev =>
        prev.map(ci => (ci.id === existing.id ? { ...ci, quantity: String(nextQty) } : ci))
      )
    } else {
      const newItem: CartItem = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        medicine: med,
        batch,
        quantity: '1',
        unitPrice: price,
        discount: '0',
        saleUnit: 'container'
      }
      setCart(prev => [...prev, newItem])
    }
    return true
  }, [cart])

  const upsertItem = useCallback((item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.id === item.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = item
        return copy
      }
      // Check for exact batch + unit duplicate
      const duplicateIdx = prev.findIndex(
        ci => ci.batch.id === item.batch.id && ci.saleUnit === item.saleUnit
      )
      if (duplicateIdx >= 0) {
        const copy = [...prev]
        const mergedQty =
          (parseFloat(copy[duplicateIdx].quantity) || 0) + (parseFloat(item.quantity) || 0)
        copy[duplicateIdx] = { ...copy[duplicateIdx], quantity: String(roundDecimal(mergedQty, 4)) }
        return copy
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(ci => ci.id !== id))
  }, [])

  const adjustQty = useCallback((id: string, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.id !== id) return c
        const ratio = c.medicine.subUnitsPerContainer ?? 1
        const step = c.saleUnit === 'sub' ? 1 : 1
        const current = parseFloat(c.quantity) || 0
        const maxCap = c.saleUnit === 'sub' ? c.batch.quantity * ratio : c.batch.quantity
        const next = Math.max(step, Math.min(maxCap, roundDecimal(current + delta * step, 4)))
        return { ...c, quantity: String(next) }
      })
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const totals = useMemo(() => {
    const rawSubtotal = cart.reduce((acc, ci) => {
      const q = parseFloat(ci.quantity) || 0
      const p = parseFloat(ci.unitPrice) || 0
      return acc + q * p
    }, 0)

    const itemDiscounts = cart.reduce((acc, ci) => acc + (parseFloat(ci.discount) || 0), 0)
    const netItemsTotal = Math.max(0, rawSubtotal - itemDiscounts)

    return {
      itemCount: cart.length,
      rawSubtotal: roundDecimal(rawSubtotal, 2),
      itemDiscounts: roundDecimal(itemDiscounts, 2),
      netItemsTotal: roundDecimal(netItemsTotal, 2)
    }
  }, [cart])

  return {
    cart,
    quickAdd,
    upsertItem,
    removeItem,
    adjustQty,
    clearCart,
    totals,
    getCommittedBatchQty
  }
}