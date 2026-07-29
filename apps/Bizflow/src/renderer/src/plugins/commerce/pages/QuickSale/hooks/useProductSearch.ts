import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useBarcodeScanner } from '@renderer/hooks/useBarcodeScanner'
import { ipc } from '@renderer/utils/ipc'
import { BARCODE_PATTERNS, SEARCH_CONFIG } from '@/shared/constants'
import type { Product, ProductVariant } from '../types'
import { getVariantLabel } from '../utils'
import logger from '@/shared/utils/logger'
type UseProductSearchOptions = {
  onAddToCart: (product: Product, variant?: ProductVariant) => void
}

export function useProductSearch({ onAddToCart }: UseProductSearchOptions) {
  const { showToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset variant selection when product collapses
  useEffect(() => {
    if (!expandedProductId) {
      setSelectedVariantIndex(-1)
    }
  }, [expandedProductId, selectedIndex])

  const handleProductSelect = useCallback(
    (product: Product) => {
      if (product.hasVariants && product.variants && product.variants.length > 1) {
        setExpandedProductId(product.id)
        setSelectedVariantIndex(-1)
      } else {
        const variant = product.variants?.[0]
        onAddToCart(product, variant)

        if (variant) {
          showToast('success', `Added ${product.name} (${getVariantLabel(variant)})`)
        } else {
          showToast('success', `Added ${product.name}`)
        }
      }
    },
    [onAddToCart, showToast]
  )

  const performSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setIsSearching(true)
      try {
        const isBarcodeQuery = BARCODE_PATTERNS.isBarcode(trimmedQuery)

        const response = await (window as any).api['search:products']({
          filters: {
            query: isBarcodeQuery ? undefined : trimmedQuery,
            barcode: isBarcodeQuery ? trimmedQuery : undefined,
          },
          pagination: {
            page: 1,
            limit: isBarcodeQuery
              ? SEARCH_CONFIG.BARCODE_RESULT_LIMIT
              : SEARCH_CONFIG.TEXT_RESULT_LIMIT,
          },
          includeImages: false,
          enrichData: SEARCH_CONFIG.ENRICH_DATA_DEFAULT,
        })

        const results = response?.items || []
        setSearchResults(results)
        setShowDropdown(results.length > 0)
        setSelectedIndex(-1)

        // Auto-add exact barcode match
        if (isBarcodeQuery && results.length === 1) {
          const product = results[0]

          if (product.hasVariants && product.variants && product.variants.length > 0) {
            const barcodeMatch = product.variants.find(
              (v: ProductVariant) =>
                v.barcode && v.barcode.toLowerCase() === trimmedQuery.toLowerCase()
            )

            if (barcodeMatch) {
              onAddToCart(product, barcodeMatch)
            } else {
              handleProductSelect(product)
            }
          } else {
            handleProductSelect(product)
          }

          setSearchQuery('')
          setShowDropdown(false)
        }
      } catch (error) {
        logger.error('Search error:', error)
        setSearchResults([])
        setShowDropdown(false)
        setSelectedIndex(-1)
      } finally {
        setIsSearching(false)
      }
    },
    [onAddToCart, handleProductSelect]
  )

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      setSelectedIndex(-1)
      return
    }

    const isBarcodePattern = BARCODE_PATTERNS.isBarcode(searchQuery)
    const debounceTime = isBarcodePattern
      ? SEARCH_CONFIG.BARCODE_DEBOUNCE
      : SEARCH_CONFIG.TEXT_DEBOUNCE

    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, debounceTime)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Close dropdown on outside click
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

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || searchResults.length === 0) return

      const currentProduct = selectedIndex >= 0 ? searchResults[selectedIndex] : null
      const isExpanded = currentProduct && expandedProductId === currentProduct.id
      const variantCount = currentProduct?.variants?.length || 0

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (isExpanded && selectedVariantIndex < variantCount - 1) {
            setSelectedVariantIndex((prev) => prev + 1)
          } else if (selectedIndex < searchResults.length - 1) {
            setSelectedIndex((prev) => prev + 1)
            setSelectedVariantIndex(-1)
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (isExpanded && selectedVariantIndex > -1) {
            setSelectedVariantIndex((prev) => prev - 1)
          } else if (selectedIndex > 0) {
            setSelectedIndex((prev) => prev - 1)
            setSelectedVariantIndex(-1)
          } else if (selectedIndex === 0) {
            setSelectedIndex(-1)
            setSelectedVariantIndex(-1)
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            const product = searchResults[selectedIndex]
            const hasMultipleVariants =
              product.hasVariants && product.variants && product.variants.length > 1
            if (hasMultipleVariants && !isExpanded) {
              setExpandedProductId(product.id)
              setSelectedVariantIndex(-1)
            }
          }
          break

        case 'ArrowLeft':
          e.preventDefault()
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
              const variant = product.variants[selectedVariantIndex]
              if (variant && variant.stock > 0) {
                onAddToCart(product, variant)
                showToast(
                  'success',
                  `Added ${product.name} (${getVariantLabel(variant)})`
                )
              }
            } else if (product.totalStock > 0) {
              handleProductSelect(product)
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
    },
    [
      showDropdown,
      searchResults,
      selectedIndex,
      expandedProductId,
      selectedVariantIndex,
      onAddToCart,
      handleProductSelect,
      showToast,
    ]
  )

  // Hardware barcode scanner
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const result = await ipc.inventory.searchByBarcode(barcode)

        if (!result) {
          showToast('error', `No product found: ${barcode}`)
          return
        }

        if (result.selectedVariant) {
          onAddToCart(result, result.selectedVariant)
          showToast(
            'success',
            `Added ${result.name} (${getVariantLabel(result.selectedVariant)})`
          )
        } else {
          onAddToCart(result)
          showToast('success', `Added ${result.name}`)
        }
      } catch (error) {
        logger.error('Error scanning barcode:', error)
        showToast('error', 'Failed to add product')
      }
    },
    [onAddToCart, showToast]
  )

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 3,
    maxLength: 50,
    preventDuplicates: false,
  })

  const resetSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    setExpandedProductId(null)
    setSelectedVariantIndex(-1)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    selectedIndex,
    expandedProductId,
    setExpandedProductId,
    selectedVariantIndex,
    searchInputRef,
    dropdownRef,
    handleProductSelect,
    handleSearchKeyDown,
    resetSearch,
  }
}