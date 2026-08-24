// src/pages/POS/hooks/useActiveOrder.ts
import { useState, useEffect, useCallback } from 'react'
import { PosOrder, PosMenuItem, CourseType, DiscountType } from '../types'
import { sounds } from '../../utils/sound'

export function useActiveOrder(initialOrderId?: string) {
  const [order, setOrder] = useState<PosOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeSeat, setActiveSeat] = useState<number>(1)

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const data = await window.api.restaurant.getOrder(id)
      setOrder(data || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialOrderId) fetchOrder(initialOrderId)
  }, [initialOrderId, fetchOrder])

  // Real-Time Event Bus Subscription: Instant sync across screens without polling
  useEffect(() => {
    const unsubOrder = window.api.restaurant.onEvent('order:updated', (updated: PosOrder) => {
      if (order && updated.id === order.id) {
        setOrder(updated)
      }
    })

    const unsubSettled = window.api.restaurant.onEvent('order:settled', ({ orderId }: { orderId: string }) => {
      if (order && order.id === orderId) {
        setOrder(null)
      }
    })

    return () => {
      unsubOrder()
      unsubSettled()
    }
  }, [order])

  const addItemToOrder = async (
    menuItem: PosMenuItem,
    quantity = 1,
    course: CourseType = 'main',
    seatNumber = activeSeat,
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
        seatNumber,
        station: menuItem.station || 'Kitchen',
        notes: notes || null,
        modifiers: modifiers.length ? JSON.stringify(modifiers) : null
      })
      await fetchOrder(order.id)
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to add item to ticket')
    }
  }

  const updateItemQty = async (itemId: string, quantity: number) => {
    if (!order) return
    try {
      if (quantity <= 0) {
        await window.api.restaurant.removeOrderItem( itemId )
      } else {
        await window.api.restaurant.updateOrderItem({ id: itemId, quantity })
      }
      await fetchOrder(order.id)
    } catch (err: any) {
      sounds.playError()
    }
  }

  const fireCourse = async (course: CourseType) => {
    if (!order) return
    try {
      sounds.playBump()
      await window.api.restaurant.fireCourse({ orderId: order.id, course })
      await fetchOrder(order.id)
    } catch (err: any) {
      sounds.playError()
    }
  }

  const splitBySeats = async (seatNumbers: number[]) => {
    if (!order) return
    await window.api.restaurant.splitCheckBySeat({ orderId: order.id, seatNumbers })
    await fetchOrder(order.id)
  }

  const applyDiscount = async (discountType: DiscountType, discountAmount: number) => {
    if (!order) return
    await window.api.restaurant.applyDiscount({ orderId: order.id, discountType, discountAmount })
    await fetchOrder(order.id)
  }

  const processPayment = async (amount: number, paymentMethod: string, reference?: string, tipAmount = 0) => {
    if (!order) return
    const res = await window.api.restaurant.processPayment({
      orderId: order.id,
      amount,
      paymentMethod,
      reference,
      tipAmount
    })
    await fetchOrder(order.id)
    return res
  }

  return {
    order,
    loading,
    setOrder,
    activeSeat,
    setActiveSeat,
    addItemToOrder,
    updateItemQty,
    fireCourse,
    splitBySeats,
    applyDiscount,
    processPayment
  }
}