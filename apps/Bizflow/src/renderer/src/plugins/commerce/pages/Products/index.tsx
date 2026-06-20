/**
 * Products Page - Backend Search Integration
 * Clean, modular architecture with backend filtering
 * Features fast search, pagination, and filtering via backend
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useBackendSearch, useFilterMetadata } from '@renderer/hooks/useBackendSearch'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDisplaySettings } from '@renderer/contexts/DisplaySettingsContext'
import { useDebounce } from '@renderer/hooks/useDebounce'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useBarcodeScanner } from '@renderer/hooks/useBarcodeScanner'
import Modal from '@renderer/components/ui/Modal'
import SmartDeleteDialog from '@renderer/components/SmartDeleteDialog'
import BarcodePrintDialog from '@renderer/components/BarcodePrintDialog'
import ProductFormWrapper from './ProductFormWrapper'
import ProductActions from './ProductActions'
import ProductFilters from './ProductFilters'
import ProductGrid from './ProductGrid'
import type { Product, ProductFilters as Filters } from './types'
import logger from '@/shared/utils/logger'

export default function Products() {
  const { t } = useLanguage()
  const toast = useToast()
  const { settings } = useDisplaySettings()

  // Load filter metadata
  const { metadata: filterMetadata } = useFilterMetadata()

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteCheckResult, setDeleteCheckResult] = useState<any>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  // Barcode print dialog states
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [printBarcode, setPrintBarcode] = useState<{ code: string; name: string }>({ code: '', name: '' })

  // Filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    searchQuery: '',
    category: '',
    color: '',
    size: '',
    store: '',
    stockStatus: ''
  })

  // Barcode scanner integration - search for products by barcode
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const result = await ipc.inventory.searchByBarcode(barcode)
      
      if (!result) {
        toast.error(`No product found with barcode: ${barcode}`)
        return
      }

      // Update search query to show the found product
      setFilters(prev => ({
        ...prev,
        searchQuery: result.name // Search by product name to show it
      }))
      
      toast.success(`Found: ${result.name}`)
      
      // Auto-open view modal for the found product - fetch full details
      setTimeout(async () => {
        try {
          const fullProduct = await ipc.products.getById(result.id)
          
          // Calculate total stock from variants
          const totalStock = fullProduct.variants && fullProduct.variants.length > 0
            ? fullProduct.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
            : 0
          
          setSelectedProduct({ ...fullProduct, totalStock })
          setShowViewModal(true)
        } catch (error) {
          logger.error('Failed to load product details:', error)
          toast.error('Failed to load product details')
        }
      }, 100)
    } catch (error) {
      logger.error('Error scanning barcode:', error)
      toast.error('Failed to search product')
    }
  }, [toast])

  // Enable barcode scanner
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 3,
    maxLength: 50,
    preventDuplicates: false // Allow scanning same product multiple times
  })

  // Pagination
  const itemsPerPage = 12

  // Debounce search query (300ms delay)
  const debouncedSearch = useDebounce(filters.searchQuery, 300)

  // Memoize filters object to prevent unnecessary re-renders
  const searchFilters = useMemo(() => ({
    query: debouncedSearch,
    categoryIds: filters.category ? [filters.category] : undefined,
    storeId: filters.store || undefined,
    stockStatus: filters.stockStatus ? 
      filters.stockStatus === 'in-stock' ? ['low', 'normal', 'high'] as any :
      filters.stockStatus === 'low-stock' ? ['low'] as any :
      filters.stockStatus === 'out-of-stock' ? ['out'] as any :
      undefined : undefined
  }), [debouncedSearch, filters.category, filters.store, filters.stockStatus])

  // Memoize sort options
  const searchSort = useMemo(() => ({
    field: 'createdAt' as const,
    direction: 'desc' as const  // Newest first
  }), [])

  // Backend search with filters
  const {
    data: products,
    loading,
    totalCount,
    pagination,
    refetch
  } = useBackendSearch<Product>({
    endpoint: 'search:products',
    filters: searchFilters,
    sort: searchSort,
    options: {
      debounceMs: 300,
      limit: itemsPerPage,
      includeImages: settings.showImagesInProductCards
    }
  })

  // Calculate totalStock for each product from variants
  const productsWithStock = useMemo(() => {
    return products.map(product => {
      // If totalStock is already calculated by backend, use it
      if (typeof product.totalStock === 'number') {
        return product
      }
      
      // Calculate total stock from all variants
      let totalStock = 0
      if (product.variants && product.variants.length > 0) {
        totalStock = product.variants.reduce((sum, variant) => {
          return sum + (typeof variant.stock === 'number' ? variant.stock : 0)
        }, 0)
      }
      
      return {
        ...product,
        totalStock
      }
    })
  }, [products])

  // Extract filter options from metadata
  const filterOptions = useMemo(() => {
    if (!filterMetadata) {
      return {
        categories: [],
        stores: []
      }
    }
    
    return {
      categories: (filterMetadata.categories || []).map((cat: any) => cat.name),
      stores: []
    }
  }, [filterMetadata])

  // Store list for filters
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])

  // Load stores once on mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const data = await ipc.stores.getAll()
        setStores(data.filter((s: any) => s.status === 'active').map((s: any) => ({
          id: s.id,
          name: s.name
        })))
      } catch (error) {
        logger.error('Failed to load stores:', error)
      }
    }
    loadStores()
  }, [])

  const handleFiltersChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    pagination.setPage(1) // Reset to first page when filters change
  }, [pagination])

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      category: '',
      color: '',
      size: '',
      store: '',
      stockStatus: ''
    })
    pagination.setPage(1)
  }, [pagination])

  const handleView = useCallback(async (product: Product) => {
    // Fetch full product details with images
    try {
      const fullProduct = await ipc.products.getById(product.id)
      
      // Calculate total stock from variants
      const totalStock = fullProduct.variants && fullProduct.variants.length > 0
        ? fullProduct.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
        : 0
      
      setSelectedProduct({ ...fullProduct, totalStock })
      setShowViewModal(true)
    } catch (error) {
      logger.error('Failed to load product details:', error)
      toast.error('Failed to load product details')
    }
  }, [toast])

  const handleEdit = useCallback(async (product: Product) => {
    // Fetch full product details with images
    try {
      const fullProduct = await ipc.products.getById(product.id)
      setSelectedProduct(fullProduct)
      setShowEditModal(true)
    } catch (error) {
      logger.error('Failed to load product details:', error)
      toast.error('Failed to load product details')
    }
  }, [toast])

  const handleDelete = useCallback(async (product: Product) => {
    try {
      // Check if product can be deleted
      const result = await window.electron.ipcRenderer.invoke('delete:check-product', {
        productId: product.id
      })
      
      if (result.success) {
        setProductToDelete(product)
        setDeleteCheckResult(result.data)
        setShowDeleteDialog(true)
      } else {
        toast.error('Failed to check product dependencies')
      }
    } catch (error) {
      logger.error('Failed to check product:', error)
      toast.error('Failed to check product')
    }
  }, [toast])
  
  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return
    
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:hard-delete-product', {
        productId: productToDelete.id
      })
      
      if (result.success) {
        toast.success('Product deleted successfully')
        refetch()
      } else {
        toast.error(result.error || 'Failed to delete product')
      }
    } catch (error) {
      logger.error('Failed to delete product:', error)
      toast.error('Failed to delete product')
    }
  }, [productToDelete, toast, refetch])
  
  const handleArchiveProduct = useCallback(async (reason?: string) => {
    if (!productToDelete) return
    
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:archive-product', {
        productId: productToDelete.id,
        archivedBy: 'current-user', // TODO: Get from auth context
        reason
      })
      
      if (result.success) {
        toast.success('Product archived successfully')
        refetch()
      } else {
        toast.error('Failed to archive product')
      }
    } catch (error) {
      logger.error('Failed to archive product:', error)
      toast.error('Failed to archive product')
    }
  }, [productToDelete, toast, refetch])

  const handleImport = useCallback(() => {
    toast.info('Import feature coming soon')
  }, [toast])

  const handleExport = useCallback(() => {
    // Export to CSV
    const csv = [
      ['Name', 'SKU', 'Category', 'Price', 'Cost', 'Stock'].join(','),
      ...productsWithStock.map(p => [
        p.name,
        p.baseSKU,
        p.category,
        p.basePrice,
        p.baseCost,
        p.totalStock || 0
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Products exported successfully')
  }, [productsWithStock, toast])

  const handleScan = useCallback(() => {
    toast.info('Barcode scanner feature coming soon')
  }, [toast])

  const handleFormSuccess = useCallback(() => {
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedProduct(null)
    refetch() // Refetch to reload fresh data
  }, [refetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 mx-auto">
      {/* Actions Toolbar */}
      <div className="flex items-center justify-between mb-6">
        
        <ProductActions
          onAdd={() => setShowAddModal(true)}
          onImport={handleImport}
          onExport={handleExport}
          onScan={handleScan}
          onRefresh={refetch}
          productsCount={totalCount}
        />
      </div>

      {/* Filters */}
      <ProductFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        categories={filterOptions.categories}
        stores={stores}
        showAdvanced={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {/* Products Grid */}
      <ProductGrid
        products={productsWithStock}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('showing')} {((pagination.currentPage - 1) * itemsPerPage) + 1} {t('to')} {Math.min(pagination.currentPage * itemsPerPage, totalCount)} {t('of')} {totalCount} {t('productsCount')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={pagination.prevPage}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('previous')}
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => pagination.setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          pagination.currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={pagination.nextPage}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('addProduct')}>
        <ProductFormWrapper
          onSuccess={handleFormSuccess}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={t('editProduct')}>
        <ProductFormWrapper
          product={selectedProduct}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* View Product Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={t('productDetails')}>
        {selectedProduct && (
          <div className="space-y-4">
            {/* Product Images Gallery */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('images')} ({selectedProduct.images.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProduct.images.map((image: any, idx: number) => (
                    <img
                      key={idx}
                      src={image.imageData}
                      alt={`${selectedProduct.name} ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('productName')}</div>
                <p className="text-lg font-semibold">{selectedProduct.name}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('sku')}</div>
                <p className="text-lg font-semibold">{selectedProduct.baseSKU}</p>
              </div>
              {!selectedProduct.hasVariants && selectedProduct.baseBarcode && (
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Barcode</div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold font-mono text-green-600 dark:text-green-400">{selectedProduct.baseBarcode}</p>
                    <button
                      onClick={() => {
                        setPrintBarcode({ code: selectedProduct.baseBarcode!, name: selectedProduct.name })
                        setShowPrintDialog(true)
                      }}
                      className="px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
                    >
                      Print Barcode
                    </button>
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('category')}</div>
                <p className="text-lg font-semibold">
                  {typeof selectedProduct.category === 'string' 
                    ? selectedProduct.category 
                    : (selectedProduct.category as any)?.name || t('uncategorized')}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('price')}</div>
                <p className="text-lg font-semibold">${selectedProduct.basePrice.toFixed(2)}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('cost')}</div>
                <p className="text-lg font-semibold">${selectedProduct.baseCost.toFixed(2)}</p>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('totalStock')}</div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{selectedProduct.totalStock || 0}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    (selectedProduct.totalStock || 0) === 0 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : (selectedProduct.totalStock || 0) <= 10
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {(selectedProduct.totalStock || 0) === 0 
                      ? t('outOfStock') 
                      : (selectedProduct.totalStock || 0) <= 10 
                      ? t('lowStock') 
                      : t('inStock')}
                  </span>
                </div>
              </div>
            </div>
            {selectedProduct.description && (
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t('description')}</div>
                <p className="text-slate-900 dark:text-white">{selectedProduct.description}</p>
              </div>
            )}
            {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t('variants')}</div>
                <div className="space-y-2">
                  {selectedProduct.variants.map((variant, idx) => (
                    <div key={variant.id || idx} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{(variant as any).attributeValues?.map((av: any) => `${av.attribute?.name}: ${av.value}`).join(' / ') || variant.sku}</span>
                            <span className="text-sm text-slate-500">{t('sku')}: {variant.sku}</span>
                          </div>
                          {variant.barcode && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-slate-500">Barcode:</span>
                              <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                                {variant.barcode}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-3">
                          <div className="text-right">
                            <div className="font-semibold">${variant.price.toFixed(2)}</div>
                            <div className="text-sm text-slate-500">{t('stock')}: {variant.stock}</div>
                          </div>
                          {variant.barcode && (
                            <button
                              onClick={() => {
                                setPrintBarcode({
                                  code: variant.barcode!,
                                  name: `${selectedProduct.name} - ${(variant as any).attributeValues?.map((av: any) => av.value).join(' / ') || variant.sku}`
                                })
                                setShowPrintDialog(true)
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors whitespace-nowrap"
                            >
                              Print
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Smart Delete Dialog */}
      <SmartDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setProductToDelete(null)
          setDeleteCheckResult(null)
        }}
        entityType="product"
        entityName={productToDelete?.name || ''}
        checkResult={deleteCheckResult}
        onDelete={handleConfirmDelete}
        onArchive={handleArchiveProduct}
      />
      
      {/* Barcode Print Dialog */}
      <BarcodePrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        barcode={printBarcode.code}
        productName={printBarcode.name}
      />
    </div>
  )
}
