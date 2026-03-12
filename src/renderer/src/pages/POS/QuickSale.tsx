/**
 * QuickSale Component
 * Fast table-based POS interface for quick product search and sales
 * Optimized for large datasets (1M+ products) with virtualization
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ShoppingCart, Trash2, X, DollarSign, Percent, Info } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { ipc } from '../../utils/ipc'
import AddCustomerModal from './AddCustomerModal'
import DiscountModal, { type DiscountData } from '../../components/DiscountModal'
import { PaymentFlowSelector } from './PaymentFlowSelector'
import { ReceiptPreviewModal } from '../Sales/ReceiptPreviewModal'
import type { Customer } from './types'
import { BARCODE_PATTERNS, SEARCH_CONFIG } from '../../../../shared/constants'
import logger from '../../../../shared/utils/logger'

type ProductVariant = {
  id: string
  color?: string
  size?: string
  attributeValues?: Array<{ attribute: { name: string }; value: string }>
  sku: string
  barcode?: string
  price: number
  stock: number
}

function getVariantLabel(variant: ProductVariant): string {
  if (variant.attributeValues && variant.attributeValues.length > 0) {
    return variant.attributeValues.map(av => `${av.attribute.name}: ${av.value}`).join(' / ')
  }
  return [variant.color, variant.size].filter(Boolean).join(' / ')
}

type Product = {
  id: string
  name: string
  baseSKU: string
  basePrice: number
  totalStock: number
  imageUrl?: string
  category?: string
  hasVariants?: boolean
  variants?: ProductVariant[]
}

type CartItem = {
  id: string
  productId: string
  variantId?: string
  name: string
  sku: string
  price: number
  quantity: number
  discount: number
  subtotal: number
  availableStock?: number
  variantLabel?: string // e.g., "Red / L" or "Small"
  // Discount fields
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
  discountValue?: number
  finalPrice?: number
  discountReason?: string
  discountAppliedBy?: string
}

type QuickSaleProps = {
  onCompleteSale?: (items: CartItem[], customer: Customer | null, paymentMethod: string) => Promise<void>
}

export default function QuickSale({ onCompleteSale: _onCompleteSale }: QuickSaleProps) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Variant selection state
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1) // -1 means on product, 0+ means on variant
  
  // Reset variant selection when product changes or collapses
  useEffect(() => {
    if (!expandedProductId) {
      setSelectedVariantIndex(-1)
    }
  }, [expandedProductId, selectedIndex])
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  
  // Payment flow state
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  
  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [completedTransaction, setCompletedTransaction] = useState<any>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  
  // Discount state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountingItem, setDiscountingItem] = useState<CartItem | null>(null)
  
  // Calculated totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  const taxRate = parseFloat(localStorage.getItem('taxRate') || '0')
  const tax = (subtotal * taxRate) / 100
  
  // Calculate total discount across all items
  // Discount is the difference between original price and final price
  const totalDiscount = cartItems.reduce((sum, item) => {
    if (!item.discountType || item.discountType === 'NONE' || !item.discountValue) return sum
    
    const originalPrice = item.price // Price before discount
    const finalPrice = item.finalPrice || item.price // Price after discount
    const discountPerItem = originalPrice - finalPrice
    return sum + (discountPerItem * item.quantity)
  }, 0)
  
  const total = subtotal + tax

  // Load customers and refresh cart stock info
  useEffect(() => {
    loadCustomers()
    refreshCartStock()
  }, [])

  const loadCustomers = async () => {
    try {
      const result = await window.api.customers.getAll()
      // Handle the response structure { customers: [], totalCount, hasMore }
      if (result && Array.isArray(result.customers)) {
        setCustomers(result.customers)
      } else if (Array.isArray(result)) {
        // Fallback for direct array response
        setCustomers(result)
      } else {
        setCustomers([])
      }
    } catch (error) {
      logger.error('Error loading customers:', error)
      setCustomers([])
    }
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    loadCustomers()
    setSelectedCustomer(newCustomer)
    setShowAddCustomerModal(false)
  }

  // Refresh stock information for items in cart
  const refreshCartStock = async () => {
    if (cartItems.length === 0) return
    
    try {
      // Fetch latest stock for all cart items
      const productIds = cartItems.map(item => item.productId)
      for (const productId of productIds) {
        const response = await (window as any).api['search:products']({
          query: productId,
          limit: 1,
          includeImages: false
        })
        
        const results = response?.items || []
        if (results.length > 0) {
          const product = results[0]
          setCartItems(prev => prev.map(item =>
            item.productId === productId
              ? { ...item, availableStock: product.totalStock }
              : item
          ))
        }
      }
    } catch (error) {
      logger.error('Error refreshing stock:', error)
    }
  }

  // Debounced search with dropdown
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      setSelectedIndex(-1)
      return
    }

    // Instant search for barcode patterns
    const isBarcodePattern = BARCODE_PATTERNS.isBarcode(searchQuery)
    const debounceTime = isBarcodePattern ? SEARCH_CONFIG.BARCODE_DEBOUNCE : SEARCH_CONFIG.TEXT_DEBOUNCE

    const timer = setTimeout(async () => {
      await performSearch(searchQuery)
    }, debounceTime)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const performSearch = async (query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    
    setIsSearching(true)
    try {
      // Check if it's a barcode pattern
      const isBarcodeQuery = BARCODE_PATTERNS.isBarcode(trimmedQuery)
      
      // Backend search via IPC with barcode support
      const response = await (window as any).api['search:products']({
        filters: { 
          query: isBarcodeQuery ? undefined : trimmedQuery, // Don't use query for barcodes
          barcode: isBarcodeQuery ? trimmedQuery : undefined // Use exact barcode match
        },
        pagination: { 
          page: 1, 
          limit: isBarcodeQuery ? SEARCH_CONFIG.BARCODE_RESULT_LIMIT : SEARCH_CONFIG.TEXT_RESULT_LIMIT 
        },
        includeImages: false,
        enrichData: SEARCH_CONFIG.ENRICH_DATA_DEFAULT // Configurable via constant
      })
      
      const results = response?.items || []
    
      setSearchResults(results)
      setShowDropdown(results.length > 0)
      setSelectedIndex(-1) // Reset selection
      
      // Auto-select first result if exact barcode match and only one result
      if (isBarcodeQuery && results.length === 1) {
        const product = results[0]
        
        // Find exact variant by barcode if product has variants
        if (product.hasVariants && product.variants && product.variants.length > 0) {
          const barcodeMatch = product.variants.find(
            v => v.barcode && v.barcode.toLowerCase() === trimmedQuery.toLowerCase()
          )
          if (barcodeMatch) {
            // Add specific variant to cart
            addToCart(product, barcodeMatch)
          } else {
            // Expand to show variants if no exact match
            handleProductSelect(product)
          }
        } else {
          // Simple product - add directly
          handleProductSelect(product)
        }
        
        setSearchQuery('')
        setShowDropdown(false)
        
        // DON'T refocus - scanner works when input is NOT focused
      }
    } catch (error) {
      logger.error('Search error:', error)
      setSearchResults([])
      setShowDropdown(false)
      setSelectedIndex(-1)
    } finally {
      setIsSearching(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setExpandedProductId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle product selection - check if has variants
  const handleProductSelect = useCallback((product: Product) => {
    if (product.hasVariants && product.variants && product.variants.length > 1) {
      // Expand variants inline instead of showing modal
      setExpandedProductId(product.id)
      setSelectedVariantIndex(-1) // Start at product level
    } else {
      // Add directly if no variants or only one variant
      const variant = product.variants?.[0]
      addToCart(product, variant)
      // Show toast for manual selection
      if (variant) {
        showToast('success', `Added ${product.name} (${getVariantLabel(variant)})`)
      } else {
        showToast('success', `Added ${product.name}`)
      }
    }
  }, [ ])

  // Add product to cart with stock validation
  const addToCart = useCallback((product: Product, variant?: ProductVariant) => {
    const stock = variant ? variant.stock : product.totalStock
    const price = variant ? variant.price : product.basePrice
    const sku = variant ? variant.sku : product.baseSKU
    const variantLabel = variant 
      ? getVariantLabel(variant)
      : undefined
    
    if (stock === 0) {
      showToast('error', 'Out of stock')
      return
    }

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => 
        variant ? (item.productId === product.id && item.variantId === variant.id) : item.productId === product.id
      )
      
      if (existingIndex >= 0) {
        // Check if we can increment quantity
        const currentQty = prev[existingIndex].quantity
        if (currentQty >= stock) {
          showToast('warning', 'Stock limit reached')
          return prev
        }
        
        // Increment quantity if already in cart
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          subtotal: updated[existingIndex].price * (updated[existingIndex].quantity + 1)
        }
        return updated
      } else {
        // Add new item
        return [...prev, {
          id: variant ? `${product.id}-${variant.id}` : product.id,
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          sku: sku,
          price: price,
          quantity: 1,
          discount: 0,
          subtotal: price,
          availableStock: stock,
          variantLabel,
          // Initialize discount fields
          discountType: 'NONE',
          discountValue: 0,
          finalPrice: price
        }]
      }
    })
    
    // Keep dropdown open but collapse expanded variants
    setExpandedProductId(null)
    // DON'T refocus - scanner works when input is NOT focused
    
    // No toast here - let the caller show specific toast
  }, [])

  // Barcode scanner integration - add products directly to cart
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const result = await ipc.inventory.searchByBarcode(barcode)
      
      if (!result) {
        showToast('error', `No product found: ${barcode}`)
        return
      }

      // Add the scanned product to cart
      if (result.selectedVariant) {
        // Product with variant
        addToCart(result, result.selectedVariant)
        showToast('success', `Added ${result.name} (${getVariantLabel(result.selectedVariant)})`)
      } else {
        // Product without variant
        addToCart(result)
        showToast('success', `Added ${result.name}`)
      }

      // DON'T refocus search input - scanner works when input is NOT focused
      // This prevents barcode characters from leaking into search field
    } catch (error) {
      logger.error('Error scanning barcode:', error)
      showToast('error', 'Failed to add product')
    }
  }, [addToCart, showToast])

  // Enable barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 3,
    maxLength: 50,
    preventDuplicates: false // Allow scanning same variant multiple times
  })

  // Handle keyboard navigation in search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return

    const currentProduct = selectedIndex >= 0 ? searchResults[selectedIndex] : null
    const isExpanded = currentProduct && expandedProductId === currentProduct.id
    const variantCount = currentProduct?.variants?.length || 0

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (isExpanded && selectedVariantIndex < variantCount - 1) {
          // Navigate within variants
          setSelectedVariantIndex(prev => prev + 1)
        } else {
          // Move to next product
          if (selectedIndex < searchResults.length - 1) {
            setSelectedIndex(prev => prev + 1)
            setSelectedVariantIndex(-1) // Reset variant selection
          }
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isExpanded && selectedVariantIndex > -1) {
          // Navigate within variants (back to product when reaching -1)
          setSelectedVariantIndex(prev => prev - 1)
        } else if (selectedIndex > 0) {
          // Move to previous product
          setSelectedIndex(prev => prev - 1)
          setSelectedVariantIndex(-1) // Reset variant selection
        } else if (selectedIndex === 0) {
          setSelectedIndex(-1)
          setSelectedVariantIndex(-1)
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        // Expand variants for the selected product if it has multiple variants
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const product = searchResults[selectedIndex]
          const hasMultipleVariants = product.hasVariants && product.variants && product.variants.length > 1
          if (hasMultipleVariants && !isExpanded) {
            setExpandedProductId(product.id)
            setSelectedVariantIndex(-1) // Start at product level
          }
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        // Collapse expanded variants or reset variant selection
        if (expandedProductId) {
          setExpandedProductId(null)
          setSelectedVariantIndex(-1)
        }
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const product = searchResults[selectedIndex]
          if (isExpanded && selectedVariantIndex >= 0 && product.variants) {
            // Add specific variant
            const variant = product.variants[selectedVariantIndex]
            if (variant && variant.stock > 0) {
              addToCart(product, variant)
            }
          } else {
            // Add product or show variant selection
            if (product.totalStock > 0) {
              handleProductSelect(product)
            }
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setSelectedIndex(-1)
        setExpandedProductId(null)
        setSelectedVariantIndex(-1)
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Update cart item quantity with stock validation
  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId)
      return
    }
    
    setCartItems(prev => prev.map(item => {
      // Match by both productId and variantId (if variant exists)
      const isMatch = variantId 
        ? (item.productId === productId && item.variantId === variantId)
        : (item.productId === productId && !item.variantId)
      
      if (isMatch) {
        // Check stock availability
        if (item.availableStock && quantity > item.availableStock) {
          showToast('warning', 'Stock limit reached')
          const priceToUse = item.finalPrice || item.price
          return { ...item, quantity: item.availableStock, subtotal: priceToUse * item.availableStock }
        }
        const priceToUse = item.finalPrice || item.price
        return { ...item, quantity, subtotal: priceToUse * quantity }
      }
      return item
    }))
  }

  // Remove item from cart
  const removeFromCart = (productId: string, variantId?: string) => {
    setCartItems(prev => prev.filter(item => {
      // Keep items that don't match
      const isMatch = variantId 
        ? (item.productId === productId && item.variantId === variantId)
        : (item.productId === productId && !item.variantId)
      
      return !isMatch
    }))
  }

  // Discount functions
  const canApplyDiscount = () => {
    const isEnabled = localStorage.getItem('allowDiscounts') === 'true'
    return isEnabled
  }

  const openDiscountModal = (item: CartItem) => {
    if (!canApplyDiscount()) {
      showToast('error', 'Discounts are currently disabled in settings')
      return
    }
    setDiscountingItem(item)
    setShowDiscountModal(true)
  }

  const calculateFinalPrice = (price: number, discountType: string, discountValue: number): number => {
    if (discountType === 'PERCENTAGE') {
      return price - (price * discountValue / 100)
    } else if (discountType === 'FIXED_AMOUNT') {
      return Math.max(0, price - discountValue)
    }
    return price
  }

  const handleApplyDiscount = (discountData: DiscountData) => {
    if (!discountingItem) return

    const finalPrice = calculateFinalPrice(discountingItem.price, discountData.type, discountData.value)
    
    setCartItems(prev => prev.map(item => {
      const isMatch = discountingItem.variantId
        ? (item.productId === discountingItem.productId && item.variantId === discountingItem.variantId)
        : (item.productId === discountingItem.productId && !item.variantId)
      
      if (isMatch) {
        return {
          ...item,
          discountType: discountData.type,
          discountValue: discountData.value,
          finalPrice,
          discountReason: discountData.reason,
          discountAppliedBy: user?.id,
          subtotal: finalPrice * item.quantity
        }
      }
      return item
    }))

    showToast('success', `Discount applied: ${discountData.type === 'PERCENTAGE' ? `${discountData.value}%` : `$${discountData.value}`}`)
    setDiscountingItem(null)
  }

  // Clear cart
  const clearCart = () => {
    if (cartItems.length === 0) return
    
    if (confirm('Clear all items from cart?')) {
      setCartItems([])
      setSelectedCustomer(null)
      showToast('success', 'Cart cleared')
    }
  }

  // Complete sale
  const completeSale = async (paymentMethod: string = 'cash') => {
    if (cartItems.length === 0) {
      showToast('error', 'Cart empty')
      return
    }

    try {
      // Get current user from auth context
      if (!user?.id) {
        showToast('error', 'Login required')
        return
      }

      // For installment payments, create the sale record first
      if (paymentMethod === 'installment') {
        if (!selectedCustomer) {
          showToast('error', 'Customer required for installments')
          return
        }
        
        // Create sale record first, then PaymentFlowSelector will link deposits/installments
        const saleData = {
          items: cartItems.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.finalPrice || item.price,
            discountType: item.discountType || 'NONE',
            discountValue: item.discountValue || 0,
            discountReason: item.discountReason,
            discountAppliedBy: item.discountAppliedBy
          })),
          transactionData: {
            userId: user.id,
            paymentMethod: 'installment',
            customerName: selectedCustomer.name,
            customerId: selectedCustomer.id,
            subtotal,
            tax,
            total
          }
        }

        const result = await (window as any).api.saleTransactions.create(saleData)
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create installment sale')
        }

        // Link any unlinked deposits and installments to this sale
        const [customerDeposits, customerInstallments] = await Promise.all([
          (window as any).api.deposits.getByCustomer(selectedCustomer.id),
          (window as any).api.installments.getByCustomer(selectedCustomer.id)
        ])

        const unlinkedDeposits = customerDeposits.filter((d: any) => !d.saleId)
        const unlinkedInstallments = customerInstallments.filter((i: any) => !i.saleId)

        if (unlinkedDeposits.length > 0 || unlinkedInstallments.length > 0) {
          try {
            await (window as any).api.installments.linkToSale({
              installmentIds: unlinkedInstallments.map((i: any) => i.id),
              depositIds: unlinkedDeposits.map((d: any) => d.id),
              saleId: result.transaction.id
            })
          } catch (linkError) {
            logger.error('Failed to link deposits/installments to sale:', linkError)
          }
        }

        showToast('success', 'Installment sale completed')
        
        // Re-fetch transaction with full details including installments
        const fullTransaction = await (window as any).api.saleTransactions.getById(result.transaction.id)
        
        // Attach product info from cart to the items
        const itemsWithProducts = (result.items || []).map((item: any, index: number) => ({
          ...item,
          product: {
            name: cartItems[index]?.name || 'Unknown Product'
          }
        }))
        
        // Show receipt option with full transaction data
        setCompletedTransaction({
          ...fullTransaction,
          items: itemsWithProducts
        })
        setShowReceiptModal(true)
        
        // Reset
        setCartItems([])
        setSelectedCustomer(null)
        setSearchQuery('')
        setSearchResults([])
        setShowPaymentOptions(false)
        return
      }

      // Fallback: original implementation
      // Prepare sale data using the saleTransactions API
      const saleData = {
        items: cartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.finalPrice || item.price, // Use final price after discount
          // Discount fields
          discountType: item.discountType || 'NONE',
          discountValue: item.discountValue || 0,
          discountReason: item.discountReason,
          discountAppliedBy: item.discountAppliedBy
        })),
        transactionData: {
          userId: user.id,
          paymentMethod: paymentMethod, // Use the passed payment method
          customerName: selectedCustomer?.name,
          customerId: selectedCustomer?.id,
          subtotal,
          tax,
          total
        }
      }

      // Submit sale via IPC
      const result = await (window as any).api.saleTransactions.create(saleData)
      
      showToast('success', 'Sale completed')
      
      // Show receipt option
      if (result.success && result.transaction) {
        // Attach product info from cart to the items
        const itemsWithProducts = (result.items || []).map((item: any, index: number) => ({
          ...item,
          product: {
            name: cartItems[index]?.name || 'Unknown Product'
          }
        }))
        
        setCompletedTransaction({
          ...result.transaction,
          items: itemsWithProducts
        })
        setShowReceiptModal(true)
      }
      
      // Reset
      setCartItems([])
      setSelectedCustomer(null)
      setSearchQuery('')
      setSearchResults([])
      setShowPaymentOptions(false)
      
    } catch (error) {
      logger.error('Sale error:', error)
      showToast('error', 'Sale failed')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with '/'
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Clear search with Escape
      if (e.key === 'Escape') {
        if (showDropdown) {
          setShowDropdown(false)
          setSearchQuery('')
          setExpandedProductId(null)
        } else if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDropdown])

  return (
    <div className="h-full flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900 overflow-y-scroll">
      {/* Search Bar with Dropdown - Compact */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              placeholder={t('searchProductsPlaceholder')}
              className="w-full pl-10 pr-24 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoComplete="off"
            />
          </div>
          <div className="relative group">
            <Info size={20} className="text-slate-400 hover:text-primary cursor-help" />
            <div className="absolute inset-x-0 top-8 w-72 max-w-[calc(100vw-2rem)] mx-auto p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 
                        ltr:right-0 ltr:left-auto 
                        rtl:left-0 rtl:right-auto 
                        sm:inset-x-auto sm:w-72
                        sm:ltr:right-0 sm:ltr:left-auto
                        sm:rtl:left-0 sm:rtl:right-auto">
              <div className="font-semibold mb-2">📱 Barcode Scanner Usage:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>{t('toScanQuick')}:</strong> {t('scanningAdv')}</li>
                <li><strong>{t('toTypeQuick')}:</strong> {t('typingAdv')}</li>
                <li><strong>{t('QuickTipQuick')}:</strong> {t('quickTipAdv')}</li>
              </ul>
            </div>
          </div>
          {isSearching && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2 z-10">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          {/* Barcode Indicator */}
          {BARCODE_PATTERNS.isBarcode(searchQuery) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded text-xs font-medium text-primary">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" />
              </svg>
              Barcode
            </div>
          )}
          
          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-80 overflow-auto z-40"
            >
              {searchResults.map((product, index) => {
                const cartItemsForProduct = cartItems.filter(item => item.productId === product.id)
                const totalInCart = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0)
                const inCart = cartItemsForProduct.length > 0
                const remainingStock = product.totalStock - totalInCart
                const isExpanded = expandedProductId === product.id
                const hasMultipleVariants = product.hasVariants && product.variants && product.variants.length > 1
                
                // Debug log for each product render
                
                
                return (
                  <div key={product.id} className="border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                    <div
                      className={`w-full px-3 py-2 flex items-center gap-2 transition-colors ${
                        index === selectedIndex
                          ? 'bg-primary/10 dark:bg-primary/20 border-l-4 border-l-primary'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      } ${product.totalStock === 0 ? 'opacity-50' : ''}`}
                    >
                      <button
                        onClick={() => !hasMultipleVariants && handleProductSelect(product)}
                        disabled={product.totalStock === 0}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <div className="relative w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded" />
                          ) : (
                            <ShoppingCart size={16} className="text-slate-400" />
                          )}
                          {inCart && totalInCart > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                              {totalInCart}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                            {hasMultipleVariants && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                                {product.variants?.length || 0} variants
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{product.baseSKU}</p>
                            {product.category && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
                              </>
                            )}
                            {inCart && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-medium text-primary">{t('inCart')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            remainingStock === 0 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : remainingStock < 10
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {inCart ? `${remainingStock}/${product.totalStock}` : product.totalStock}
                          </span>
                          <span className="text-base font-semibold text-primary">
                            ${product.basePrice.toFixed(2)}
                          </span>
                        </div>
                      </button>
                      
                      {/* Variants Toggle Button */}
                      {hasMultipleVariants && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setExpandedProductId(isExpanded ? null : product.id)
                          }}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                          title={isExpanded ? 'Hide variants' : 'Show variants'}
                        >
                          <svg 
                            className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Expanded Variants List */}
                    {isExpanded && hasMultipleVariants && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 space-y-1">
                        {product.variants?.map((variant, variantIdx) => {
                          const variantLabel = getVariantLabel(variant)
                          const variantInCart = cartItems.find(item => item.variantId === variant.id)
                          const isVariantSelected = index === selectedIndex && variantIdx === selectedVariantIndex
                          
                          return (
                            <button
                              key={variant.id}
                              onClick={() => {
                                addToCart(product, variant)
                                showToast('success', `Added ${product.name} (${variantLabel})`)
                              }}
                              disabled={variant.stock === 0}
                              className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-all text-left ${
                                variant.stock === 0
                                  ? 'bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                                  : isVariantSelected
                                  ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary shadow-md scale-[1.02]'
                                  : 'bg-white dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99] border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {variantLabel || 'Default'}
                                  </p>
                                  {variantInCart && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 dark:bg-primary/20 rounded">
                                      <ShoppingCart size={10} className="text-primary" />
                                      <span className="text-xs font-bold text-primary">{variantInCart.quantity}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{variant.sku}</p>
                                  {variant.barcode && (
                                    <>
                                      <span className="text-xs text-slate-400">•</span>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{variant.barcode}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  variant.stock === 0
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : variant.stock < 10
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {variant.stock}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  ${variant.price.toFixed(2)}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section - Takes Most of the Screen */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex-1 flex flex-col min-h-0 relative z-10">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cart ({cartItems.length})
            </h3>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={14} />
              {t('clear')}
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                <ShoppingCart size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">{t('yourCartIsEmpty')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                {t('searchForProducts')}
              </p>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-slate-600 rounded border border-slate-300 dark:border-slate-500 font-mono">/</kbd>
                  <span>{t('toFocusSearch')}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                  <div className="flex items-center gap-2 justify-center">
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">↓</kbd>
                    <span>{t('navigate')}</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">→</kbd>
                    <span>{t('expand')}</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] border border-slate-300 dark:border-slate-500">←</kbd>
                    <span>{t('collapse')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('product')}</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('qty')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('price')}</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('total')}</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {cartItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                        {item.variantLabel && (
                          <p className="text-xs text-primary font-medium mt-0.5">{item.variantLabel}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                          {item.availableStock && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className={`text-xs font-medium ${
                                item.availableStock < 10 
                                  ? 'text-amber-600 dark:text-amber-400' 
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {item.availableStock} {t('inStock')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-all hover:scale-110 active:scale-95"
                          title="Decrease quantity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                          </svg>
                        </button>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max={item.availableStock || 9999}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1, item.variantId)}
                            className={`w-14 px-2 py-1.5 text-sm text-center border-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                              item.availableStock && item.quantity >= item.availableStock
                                ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-slate-300 dark:border-slate-600 hover:border-primary/50'
                            }`}
                          />
                          {item.availableStock && item.quantity >= item.availableStock && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" title="Max stock reached" />
                          )}
                        </div>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          disabled={item.availableStock ? item.quantity >= item.availableStock : false}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          title="Increase quantity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {item.discountValue && item.discountValue > 0 ? (
                          <>
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                              ${item.price.toFixed(2)}
                            </span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              ${(item.finalPrice || item.price).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              -{item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `$${item.discountValue}`}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 dark:text-white font-medium">
                              ${item.price.toFixed(2)}
                            </span>
                            {canApplyDiscount() && (
                              <button
                                onClick={() => openDiscountModal(item)}
                                className="p-1 text-primary hover:bg-primary/10 rounded transition-all hover:scale-110 active:scale-95"
                                title="Apply discount"
                              >
                                <Percent size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.discountValue && item.discountValue > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {(() => {
                            // Calculate original price before discount
                            const originalPrice = item.discountType === 'PERCENTAGE'
                              ? item.price / (1 - item.discountValue / 100)
                              : item.price + (item.discountValue / item.quantity)
                            const originalSubtotal = originalPrice * item.quantity
                            
                            return (
                              <>
                                <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                  ${originalSubtotal.toFixed(2)}
                                </span>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  ${item.subtotal.toFixed(2)}
                                </span>
                              </>
                            )
                          })()}
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-white">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="Remove item"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cart Footer - Compact */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
     
          {/* Totals - Compact */}
          <div className="space-y-1 py-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>{t('subtotal')}:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                <span>{t('discount')}:</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500">
                <span>{t('tax')} ({taxRate}%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-1">
              <span>{t('total')}:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={cartItems.length === 0}
              className="flex-1 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('clear')}
            </button>
            <button
              onClick={() => setShowPaymentOptions(true)}
              disabled={cartItems.length === 0}
              className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-1.5"
            >
              <DollarSign size={18} />
              {t('checkout')}
            </button>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedProduct.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('selectAVariant')}</p>
              </div>
              <button
                onClick={() => {
                  setShowVariantModal(false)
                  setSelectedProduct(null)
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Variants Grid */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedProduct.variants?.map((variant) => {
                  const variantLabel = getVariantLabel(variant)
                  const inCart = cartItems.find(item => item.variantId === variant.id)
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        addToCart(selectedProduct, variant)
                        showToast('success', `Added ${selectedProduct.name} (${variantLabel})`)
                        setShowVariantModal(false)
                      }}
                      disabled={variant.stock === 0}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        variant.stock === 0
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-50 cursor-not-allowed'
                          : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white text-base">
                            {variantLabel || 'Default'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{variant.sku}</p>
                        </div>
                        {inCart && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-full">
                            <ShoppingCart size={12} className="text-primary" />
                            <span className="text-xs font-bold text-primary">{inCart.quantity}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          ${variant.price.toFixed(2)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          variant.stock === 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : variant.stock < 10
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {variant.stock === 0 ? t('outOfStock') : `${variant.stock} ${t('inStock')}`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => {
                  setShowVariantModal(false)
                  setSelectedProduct(null)
                }}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Modal */}
      {showPaymentOptions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('checkout')}
              </h3>
              <button
                onClick={() => setShowPaymentOptions(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Payment Flow Selector */}
            <div className="flex-1 overflow-auto">
              <PaymentFlowSelector
                selectedCustomer={selectedCustomer}
                customers={customers}
                customerQuery={customerQuery}
                onCustomerSelect={setSelectedCustomer}
                onCustomerQueryChange={setCustomerQuery}
                onAddNewCustomer={() => setShowAddCustomerModal(true)}
                total={total}
                onFullPayment={(method) => {
                  setShowPaymentOptions(false)
                  completeSale(method)
                }}
                onPartialPayment={() => {
                  // Just switch to installment view, no immediate action needed
                }}
                onCompleteInstallmentSale={() => {
                  setShowPaymentOptions(false)
                  completeSale('installment')
                }}
                onDepositAdded={() => {
                }}
                onInstallmentAdded={() => {
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal 
        show={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Discount Modal */}
      {discountingItem && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => {
            setShowDiscountModal(false)
            setDiscountingItem(null)
          }}
          onApply={handleApplyDiscount}
          productName={discountingItem.name}
          originalPrice={discountingItem.price}
          maxDiscountPercentage={parseFloat(localStorage.getItem('maxDiscountPercentage') || '50')}
          maxDiscountAmount={parseFloat(localStorage.getItem('maxDiscountAmount') || '100')}
          requireReason={true}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && completedTransaction && (
        <ReceiptPreviewModal
          transaction={completedTransaction}
          onClose={() => {
            setShowReceiptModal(false)
            setCompletedTransaction(null)
          }}
        />
      )}
    </div>
  )
}
