// src/plugins/restaurant/context/RestaurantContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { PosMenuItem, CourseType, ModifierOptionChoice } from '../pages/POS/types'
import { RestaurantTableData } from '../pages/tables/types'
import { sounds } from '../pages/utils/sound'

export interface DraftCartItem {
  clientId: string
  menuItemId: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  course: CourseType
  seatNumber: number
  notes?: string
  modifiers: ModifierOptionChoice[]
  station: string
}

interface SettleResult {
  payment: any
  paidTotal: number
  remaining: number
  changeDue: number
  isFullyPaid: boolean
}

interface RestaurantContextType {
  currentView: 'floor' | 'pos' | 'kds' | 'sales' | 'menu' | 'inventory' | 'shifts' | 'waste' | 'reservations'
  setCurrentView: (view: any) => void

  activeTable: RestaurantTableData | null
  activeOrderId: string | null
  activeOrderData: any | null

  openTableInPos: (table: RestaurantTableData, guestCount?: number) => Promise<void>
  openQuickCheckInPos: (type: 'takeout' | 'bar_tab' | 'delivery') => Promise<void>
  loadExistingOrderInPos: (orderId: string) => Promise<void>
  returnToFloor: () => void

  // Cart & Item Stacking
  draftItems: DraftCartItem[]
  activeSeat: number
  setActiveSeat: (seat: number) => void
  addDraftItem: (
    item: PosMenuItem,
    quantity: number,
    course: CourseType,
    seatNumber: number,
    modifiers: ModifierOptionChoice[],
    notes: string
  ) => void
  updateDraftItemQty: (clientId: string, qty: number) => void
  removeDraftItem: (clientId: string) => void
  clearDraftItems: () => void

  // Send to Kitchen & Settlement
  isSendingToKitchen: boolean
  sendDraftsToKitchen: () => Promise<boolean>
  processOrderPayment: (amount: number, method: string, reference?: string, tip?: number) => Promise<SettleResult>
  applyOrderDiscount: (type: 'percentage' | 'fixed', amount: number) => Promise<void>
  refreshActiveOrder: () => Promise<void>
  clearActiveSession: () => void
}

const RestaurantContext = createContext<RestaurantContextType | null>(null)

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<'floor' | 'pos' | 'kds' | 'sales' | 'menu' | 'inventory' | 'shifts' | 'waste' | 'reservations'>('floor')
  const [activeTable, setActiveTable] = useState<RestaurantTableData | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeOrderData, setActiveOrderData] = useState<any | null>(null)

  const [draftItems, setDraftItems] = useState<DraftCartItem[]>([])
  const [activeSeat, setActiveSeat] = useState<number>(1)
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false)

  // Fetch full order data from backend
  const refreshActiveOrder = useCallback(async () => {
    if (!activeOrderId) return
    try {
      const order = await window.api.restaurant.getOrder(activeOrderId)
      setActiveOrderData(order)
      if (order?.table) {
        setActiveTable(order.table)
      }
    } catch (e) {
      console.error(e)
    }
  }, [activeOrderId])

  useEffect(() => {
    if (activeOrderId) {
      refreshActiveOrder()
    } else {
      setActiveOrderData(null)
    }
  }, [activeOrderId, refreshActiveOrder])

  // ─── Seamless Navigation Handlers ──────────────────────────────────────────
  const openTableInPos = async (table: RestaurantTableData, guestCount = 2) => {
    sounds.playBump()
    setActiveTable(table)
    setDraftItems([])
    setActiveSeat(1)

    const existingOrder = table.orders?.[0]
    if (existingOrder) {
      setActiveOrderId(existingOrder.id)
    } else {
      try {
        const newOrder = await window.api.restaurant.openOrder({
          tableId: table.id,
          guestCount,
          serverName: 'Server',
          orderType: 'dine_in'
        })
        setActiveOrderId(newOrder.id)
        setActiveOrderData(newOrder)
      } catch (err: any) {
        sounds.playError()
        alert(err?.message || 'Failed to open table check')
        return
      }
    }
    setCurrentView('pos')
  }

  const openQuickCheckInPos = async (type: 'takeout' | 'bar_tab' | 'delivery') => {
    sounds.playBump()
    setActiveTable(null)
    setDraftItems([])
    setActiveSeat(1)

    try {
      const newOrder = await window.api.restaurant.openOrder({
        tableId: null,
        guestCount: 1,
        serverName: 'Cashier',
        orderType: type
      })
      setActiveOrderId(newOrder.id)
      setActiveOrderData(newOrder)
      setCurrentView('pos')
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to open quick check')
    }
  }

  const loadExistingOrderInPos = async (orderId: string) => {
    sounds.playBump()
    setDraftItems([])
    setActiveOrderId(orderId)
    await refreshActiveOrder()
    setCurrentView('pos')
  }

  const returnToFloor = () => {
    sounds.playBump()
    if (draftItems.length > 0) {
      if (!confirm('You have unsent draft items. Return to floor anyway?')) return
    }
    setDraftItems([])
    setCurrentView('floor')
  }

  const clearActiveSession = () => {
    setActiveTable(null)
    setActiveOrderId(null)
    setActiveOrderData(null)
    setDraftItems([])
  }

  // ─── Smart Item Stacking (Quantity Increment vs New Line) ─────────────────
  const addDraftItem = (
    item: PosMenuItem,
    quantity = 1,
    course: CourseType = 'main',
    seatNumber = activeSeat,
    modifiers: ModifierOptionChoice[] = [],
    notes = ''
  ) => {
    sounds.playSuccess()
    const extraDelta = modifiers.reduce((acc, m) => acc + (m.priceDelta || 0), 0)
    const unitPrice = item.price + extraDelta

    // Sort modifiers for accurate comparison
    const sortedModKey = modifiers.map((m) => `${m.name}_${m.priceDelta}`).sort().join('|')

    setDraftItems((prev) => {
      // Find matching existing line item in draft cart
      const existingIdx = prev.findIndex((d) => {
        const dModKey = d.modifiers.map((m) => `${m.name}_${m.priceDelta}`).sort().join('|')
        return (
          d.menuItemId === item.id &&
          d.seatNumber === seatNumber &&
          d.course === course &&
          (d.notes || '') === (notes || '') &&
          dModKey === sortedModKey
        )
      })

      if (existingIdx > -1) {
        // Stack quantity on existing line item
        const updated = [...prev]
        const target = updated[existingIdx]
        const newQty = target.quantity + quantity
        updated[existingIdx] = {
          ...target,
          quantity: newQty,
          totalPrice: target.unitPrice * newQty
        }
        return updated
      }

      // No match -> create new line item
      const newDraft: DraftCartItem = {
        clientId: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: item.id,
        itemName: item.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        course,
        seatNumber: seatNumber || 1,
        modifiers,
        notes,
        station: item.station || 'Kitchen'
      }
      return [...prev, newDraft]
    })
  }

  const updateDraftItemQty = (clientId: string, qty: number) => {
    sounds.playBump()
    if (qty <= 0) {
      setDraftItems((prev) => prev.filter((i) => i.clientId !== clientId))
    } else {
      setDraftItems((prev) =>
        prev.map((i) => (i.clientId === clientId ? { ...i, quantity: qty, totalPrice: i.unitPrice * qty } : i))
      )
    }
  }

  const removeDraftItem = (clientId: string) => {
    sounds.playBump()
    setDraftItems((prev) => prev.filter((i) => i.clientId !== clientId))
  }

  const clearDraftItems = () => setDraftItems([])

  // ─── Batch Send Drafts to Kitchen ──────────────────────────────────────────
  const sendDraftsToKitchen = async (): Promise<boolean> => {
    if (!activeOrderId || draftItems.length === 0) return false
    setIsSendingToKitchen(true)

    try {
      sounds.playSuccess()
      for (const draft of draftItems) {
        await window.api.restaurant.addOrderItem({
          orderId: activeOrderId,
          menuItemId: draft.menuItemId,
          itemName: draft.itemName,
          quantity: draft.quantity,
          unitPrice: draft.unitPrice,
          course: draft.course,
          seatNumber: draft.seatNumber,
          station: draft.station,
          notes: draft.notes || undefined,
          modifiers: draft.modifiers.length ? JSON.stringify(draft.modifiers) : undefined
        })
      }

      setDraftItems([])
      await refreshActiveOrder()
      return true
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to send items to kitchen')
      return false
    } finally {
      setIsSendingToKitchen(false)
    }
  }

  // ─── Settlement & Full Payment Engine ──────────────────────────────────────
  const processOrderPayment = async (
    amount: number,
    method: string,
    reference?: string,
    tip = 0
  ): Promise<SettleResult> => {
    if (!activeOrderId) throw new Error('No active order to settle')

    // 1. Auto-commit any pending draft items before charging
    if (draftItems.length > 0) {
      await sendDraftsToKitchen()
    }

    // 2. Execute Payment via Transactional Backend
    const res = await window.api.restaurant.processPayment({
      orderId: activeOrderId,
      amount,
      paymentMethod: method,
      reference,
      tipAmount: tip
    })

    const isFullyPaid = res.remaining <= 0.001
    const changeDue = Math.max(0, amount - (activeOrderData?.total || amount))

    if (isFullyPaid) {
      sounds.playSuccess()
      // Refresh order to show status = 'paid'
      await refreshActiveOrder()
    } else {
      sounds.playBump()
      await refreshActiveOrder()
    }

    return {
      payment: res.payment,
      paidTotal: res.paidTotal,
      remaining: res.remaining,
      changeDue,
      isFullyPaid
    }
  }

  const applyOrderDiscount = async (type: 'percentage' | 'fixed', amount: number) => {
    if (!activeOrderId) return
    await window.api.restaurant.applyDiscount({ orderId: activeOrderId, discountType: type, discountAmount: amount })
    await refreshActiveOrder()
  }

  return (
    <RestaurantContext.Provider
      value={{
        currentView,
        setCurrentView,
        activeTable,
        activeOrderId,
        activeOrderData,
        openTableInPos,
        openQuickCheckInPos,
        loadExistingOrderInPos,
        returnToFloor,
        draftItems,
        activeSeat,
        setActiveSeat,
        addDraftItem,
        updateDraftItemQty,
        removeDraftItem,
        clearDraftItems,
        isSendingToKitchen,
        sendDraftsToKitchen,
        processOrderPayment,
        applyOrderDiscount,
        refreshActiveOrder,
        clearActiveSession
      }}
    >
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext)
  if (!ctx) throw new Error('useRestaurant must be used inside RestaurantProvider')
  return ctx
}