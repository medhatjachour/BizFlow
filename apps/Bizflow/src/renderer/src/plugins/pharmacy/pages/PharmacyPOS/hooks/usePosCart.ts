import { useState, useMemo, useCallback } from 'react'
import { CartLine, PharmacyProduct, PosCustomer, PaymentMethod, SaleTransactionResult } from '../types'
import { buildCartLine, calculateSubtotal, computeStockInUnit, resolveUnitPrice } from '../utils'
import { pharma } from '../../components/_shared'

export function usePosCart(toast: any, t: (k: string) => string) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<PosCustomer | null>(null)
  const [discount, setDiscount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [heldSales, setHeldSales] = useState<{ id: string; time: string; customer?: PosCustomer | null; cart: CartLine[] }[]>([])

  const addToCart = useCallback((product: PharmacyProduct) => {
    if (product.totalStock <= 0) {
      toast.error(`${product.name} ${t('phIsOutOfStock') || 'is out of stock'}`)
      return
    }

    setCart(prev => {
      const existing = prev.find(l => l.productId === product.id && l.saleUnit === 'base')
      if (existing) {
        if (existing.quantity + 1 > computeStockInUnit(existing)) {
          toast.error(t('phNotEnoughStock') || 'Not enough stock')
          return prev
        }
        return prev.map(l => l === existing ? { ...l, quantity: l.quantity + 1 } : l)
      }
      return [buildCartLine(product), ...prev] // add to top for immediate visibility
    })
  }, [toast, t])

  const setQuantity = useCallback((index: number, quantity: number) => {
    setCart(prev => prev.map((l, i) => {
      if (i !== index) return l
      const max = computeStockInUnit(l)
      const sanitized = Math.max(1, Math.min(quantity, max))
      return { ...l, quantity: sanitized }
    }))
  }, [])

  const setUnitPrice = useCallback((index: number, price: number) => {
    setCart(prev => prev.map((l, i) => i === index ? { ...l, unitPrice: Math.max(0, price) } : l))
  }, [])

  const toggleSaleUnit = useCallback((index: number) => {
    setCart(prev => prev.map((line, i) => {
      if (i !== index || !line.ratio) return line
      const nextUnit = line.saleUnit === 'base' ? 'sub' : 'base'
      const newUnitPrice = resolveUnitPrice({
        id: line.productId,
        name: line.name,
        unit: line.unit,
        subUnit: line.subUnit,
        subUnitsPerContainer: line.ratio,
        subUnitPrice: line.subUnitPrice,
        sellingPrice: line.baseSellingPrice,
        totalStock: line.stockBase,
      }, nextUnit)

      const updatedLine: CartLine = { ...line, saleUnit: nextUnit, unitPrice: newUnitPrice }
      const maxAllowed = computeStockInUnit(updatedLine)
      return { ...updatedLine, quantity: Math.max(1, Math.min(line.quantity, maxAllowed)) }
    }))
  }, [])

  const removeLine = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setDiscount('')
    setAmountPaid('')
    setCustomer(null)
  }, [])

  const parkCurrentSale = useCallback(() => {
    if (cart.length === 0) return
    setHeldSales(prev => [
      { id: Math.random().toString(36).substring(2, 7).toUpperCase(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), customer, cart },
      ...prev,
    ])
    clearCart()
    toast.success('Sale parked on hold')
  }, [cart, customer, clearCart, toast])

  const resumeHeldSale = useCallback((heldId: string) => {
    const sale = heldSales.find(s => s.id === heldId)
    if (!sale) return
    setCart(sale.cart)
    setCustomer(sale.customer || null)
    setHeldSales(prev => prev.filter(s => s.id !== heldId))
  }, [heldSales])

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])
  const parsedDiscount = useMemo(() => Math.min(Math.max(0, parseFloat(discount) || 0), subtotal), [discount, subtotal])
  const total = useMemo(() => Math.round((subtotal - parsedDiscount) * 100) / 100, [subtotal, parsedDiscount])
  
  const parsedAmountPaid = useMemo(() => {
    if (amountPaid === '') return total
    return Math.max(0, parseFloat(amountPaid) || 0)
  }, [amountPaid, total])

  const changeDue = useMemo(() => Math.max(0, parsedAmountPaid - total), [parsedAmountPaid, total])

  const executeCheckout = useCallback(async (autoPrint: boolean): Promise<SaleTransactionResult | null> => {
    if (cart.length === 0) return null
    setBusy(true)
    try {
      const sale = await pharma()?.sales.create({
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, saleUnit: l.saleUnit })),
        discount: parsedDiscount,
        amountPaid: amountPaid === '' ? total : parsedAmountPaid,
        paymentMethod,
        customerId: customer?.id,
      })

      const transactionResult: SaleTransactionResult = {
        id: sale?.id || Math.random().toString(),
        saleNumber: sale?.saleNumber || 'SALE-NEW',
        items: [...cart],
        subtotal,
        discount: parsedDiscount,
        total,
        amountPaid: parsedAmountPaid,
        change: changeDue,
        paymentMethod,
        customer,
        createdAt: new Date().toLocaleString(),
      }

      toast.success(`${t('phSaleComplete') || 'Sale completed'} #${transactionResult.saleNumber}`)
      clearCart()
      return transactionResult
    } catch (err: any) {
      toast.error(err?.message || 'Checkout failed')
      return null
    } finally {
      setBusy(false)
    }
  }, [cart, parsedDiscount, amountPaid, total, parsedAmountPaid, paymentMethod, customer, subtotal, changeDue, clearCart, toast, t])

  return {
    cart,
    setCart,
    customer,
    setCustomer,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    subtotal,
    parsedDiscount,
    total,
    parsedAmountPaid,
    changeDue,
    busy,
    heldSales,
    addToCart,
    setQuantity,
    setUnitPrice,
    toggleSaleUnit,
    removeLine,
    clearCart,
    parkCurrentSale,
    resumeHeldSale,
    executeCheckout,
  }
}