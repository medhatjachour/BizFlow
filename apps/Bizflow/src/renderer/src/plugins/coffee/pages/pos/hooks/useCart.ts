import { useState, useCallback, useMemo } from 'react'
import type { Product, CartItem } from '../types'

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
        toast.error(`${item.productName}: max stock is ${stock}`)
        return false
      }
    }
    return true
  }, [cart, getStock, toast])

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id)
      if (idx >= 0) {
        const nextQty = prev[idx].quantity + 1
        if (nextQty > product.stock) {
          toast.error(`${product.name}: max stock is ${product.stock}`)
          return prev
        }
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: nextQty }
        return next
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        salePrice: product.price,
        quantity: 1,
      }]
    })
  }, [toast])

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.productId === productId)
      if (!item) return prev
      const nextQty = item.quantity + delta
      const stock = getStock(productId)
      if (nextQty > stock) {
        toast.error(`${item.productName}: max stock is ${stock}`)
        return prev
      }
      return prev
        .map(i => i.productId === productId ? { ...i, quantity: nextQty } : i)
        .filter(i => i.quantity > 0)
    })
  }, [getStock, toast])

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.productId !== id))
  }, [])

  const updateSalePrice = useCallback((id: string, price: number) => {
    setCart(prev => prev.map(i => i.productId === id ? { ...i, salePrice: price } : i))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  // ── Derived ──
  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.salePrice * i.quantity, 0),
    [cart]
  )
  const itemCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart]
  )

  return {
    cart, subtotal, itemCount,
    addToCart, changeQty, removeItem, updateSalePrice, clearCart,
    validateStock, getStock,
  }
}
