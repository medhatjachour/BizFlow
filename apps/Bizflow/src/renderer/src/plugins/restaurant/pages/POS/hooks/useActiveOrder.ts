import { useState, useEffect, useCallback } from 'react'
import { PosOrder, PosMenuItem, CourseType, DiscountType } from '../types'

export function useActiveOrder(initialOrderId?: string) {
  const [order, setOrder] = useState<PosOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.restaurant.getOrder(id)
      setOrder(data || null)
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch active order')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialOrderId) {
      fetchOrder(initialOrderId)
    }
  }, [initialOrderId, fetchOrder])

  const addItemToOrder = async (
    menuItem: PosMenuItem,
    quantity = 1,
    course: CourseType = 'main',
    modifiers: any[] = [],
    notes = ''
  ) => {
    if (!order) return
    try {
      const extraDelta = modifiers.reduce((acc, m) => acc + (m.priceDelta || 0), 0)
      const unitPrice = menuItem.price + extraDelta

      await window.api.restaurant.addOrderItem({
        orderId: order.id,
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        quantity,
        unitPrice,
        course,
        station: menuItem.station || 'Kitchen',
        notes: notes || null,
        modifiers: modifiers.length ? JSON.stringify(modifiers) : null
      })
      await fetchOrder(order.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to add item to ticket')
    }
  }

  const updateItemQty = async (itemId: string, quantity: number) => {
    if (!order) return
    try {
      if (quantity <= 0) {
        await window.api.restaurant.removeOrderItem(itemId)
      } else {
        await window.api.restaurant.updateOrderItem({ id: itemId, quantity })
      }
      await fetchOrder(order.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to update item quantity')
    }
  }

  const updateItemStatus = async (itemId: string, status: string) => {
    if (!order) return
    try {
      await window.api.restaurant.updateOrderItemStatus({ id: itemId, status })
      await fetchOrder(order.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to update status')
    }
  }

  const fireCourse = async (course: CourseType) => {
    if (!order) return
    try {
      await window.api.restaurant.fireCourse({ orderId: order.id, course })
      await fetchOrder(order.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to fire course')
    }
  }

  const applyDiscount = async (discountType: DiscountType, discountAmount: number) => {
    if (!order) return
    try {
      await window.api.restaurant.applyDiscount({ orderId: order.id, discountType, discountAmount })
      await fetchOrder(order.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to apply discount')
    }
  }

  const processPayment = async (amount: number, paymentMethod: string, reference?: string, tipAmount = 0) => {
    if (!order) return
    try {
      const res = await window.api.restaurant.processPayment({
        orderId: order.id,
        amount,
        paymentMethod,
        reference,
        tipAmount
      })
      await fetchOrder(order.id)
      return res
    } catch (err: any) {
      alert(err?.message || 'Payment processing failed')
      throw err
    }
  }

  const voidOrder = async (reason: string) => {
    if (!order) return
    if (!confirm('Are you sure you want to void this entire order?')) return
    try {
      await window.api.restaurant.closeOrder({ orderId: order.id, status: 'voided', notes: reason })
      setOrder(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to void order')
    }
  }

  return {
    order,
    loading,
    error,
    setOrder,
    refreshOrder: () => (order ? fetchOrder(order.id) : Promise.resolve()),
    addItemToOrder,
    updateItemQty,
    updateItemStatus,
    fireCourse,
    applyDiscount,
    processPayment,
    voidOrder
  }
}