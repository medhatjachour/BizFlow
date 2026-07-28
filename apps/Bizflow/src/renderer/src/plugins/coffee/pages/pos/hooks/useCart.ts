import { useState, useCallback, useMemo } from 'react'
import type { Product, CartItem } from '../types'

// Units that cannot be fractional
const INTEGER_UNITS = ['piece', 'box', 'cup', 'packet', 'bottle']

export function useCart(products: Product[], toast: any) {
  const [cart, setCart] = useState<CartItem[]>([])

  const productById = useCallback(
    (id: string) => products.find(p => p.id === id),
    [products]
  )

  const getStock = useCallback(
    (id: string) => {
      const p = productById(id)
      return typeof p?.stock === 'number' ? p.stock : 0
    },
    [productById]
  )

  const validateStock = useCallback(() => {
    for (const item of cart) {
      const stock = getStock(item.productId)
      if (stock < item.quantity) {
        toast.error(`${item.productName}: max stock is ${stock} ${item.unit || ''}`)
        return false
      }
    }
    return true
  }, [cart, getStock, toast])

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id)
      const stock = typeof product.stock === 'number' ? product.stock : 0
      
      if (idx >= 0) {
        const nextQty = Math.round((prev[idx].quantity + 1) * 1000) / 1000
        if (nextQty > stock) {
          toast.error(`${product.name}: max stock is ${stock} ${product.unit || ''}`)
          return prev
        }
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: nextQty }
        return next
      }
      
      if (1 > stock) {
        toast.error(`${product.name}: out of stock`)
        return prev
      }

      return [...prev, {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        salePrice: product.price,
        quantity: 1,
        unit: product.unit || 'piece',
      }]
    })
  }, [toast])

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId)
      if (!item) return prev
      
      // Force integer if unit is in INTEGER_UNITS
      const isIntUnit = INTEGER_UNITS.includes(item.unit || 'piece')
      const rawQty = item.quantity + delta
      const nextQty = Math.round((isIntUnit ? Math.floor(rawQty) : rawQty) * 1000) / 1000
      
      // FIXED: Properly check if quantity is 0 or less
      if (nextQty <= 0) {
        return prev.filter(i => i.productId !== productId)
      }
      
      const stock = getStock(productId)
      if (nextQty > stock) {
        toast.error(`${item.productName}: max stock is ${stock} ${item.unit || ''}`)
        return prev
      }
      
      return prev.map(i => 
        i.productId === productId ? { ...i, quantity: nextQty } : i
      )
    })
  }, [getStock, toast])

  const setQty = useCallback((productId: string, qty: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId)
      if (!item) return prev
      
      // Force integer if unit is in INTEGER_UNITS
      const isIntUnit = INTEGER_UNITS.includes(item.unit || 'piece')
      const enforcedQty = isIntUnit ? Math.floor(qty) : qty
      const roundedQty = Math.round(enforcedQty * 1000) / 1000
      
      // FIXED: Properly check if quantity is 0 or less
      if (roundedQty <= 0) {
        return prev.filter(i => i.productId !== productId)
      }
      
      const stock = getStock(productId)
      if (roundedQty > stock) {
        toast.error(`${item.productName}: max stock is ${stock} ${item.unit || ''}`)
        return prev
      }
      
      return prev.map(i => 
        i.productId === productId ? { ...i, quantity: roundedQty } : i
      )
    })
  }, [getStock, toast])

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.productId !== id))
  }, [])

  const updateSalePrice = useCallback((id: string, price: number) => {
    setCart(prev => prev.map(i => i.productId === id ? { ...i, salePrice: price } : i))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.salePrice * i.quantity, 0),
    [cart]
  )
  const itemCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart]
  )

  return {
    cart, 
    subtotal, 
    itemCount,
    addToCart, 
    changeQty, 
    setQty,         
    removeItem, 
    updateSalePrice, 
    clearCart,
    validateStock, 
    getStock,
  }
}
