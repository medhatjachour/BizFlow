/**
 * Professional Inventory Management Page
 * 
 * Features:
 * - Virtualized table for performance
 * - Advanced filtering and sorting
 * - Real-time metrics dashboard
 * - Item detail drawer
 * - Role-based access control
 * - Export functionality
 * - Optimistic updates with rollback
 * - Toast notifications
 */

import { useState, useMemo, lazy, Suspense } from 'react'
import { Search, Filter, Download, Plus, RefreshCw, Package, AlertTriangle, TrendingUp, History, Users, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBackendSearch, useFilterMetadata } from '../../hooks/useBackendSearch'
import { useDebounce } from '../../hooks/useDebounce'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts'
import { useOptimisticUpdate } from '../../hooks/useOptimisticUpdate'
import { useToast } from '../../contexts/ToastContext'
import { useDisplaySettings } from '../../contexts/DisplaySettingsContext'
import { useAuth } from '../../../hooks/useAuth'
import { useLanguage } from '../../contexts/LanguageContext'
import InventoryTable from './components/InventoryTable'
import Pagination from './components/Pagination'
import * as XLSX from 'xlsx'

// Lazy load heavy components - only load when tabs are clicked
const ProductAnalytics = lazy(() => import('./components/ProductAnalytics'))
const StockHistory = lazy(() => import('./components/StockHistory'))
const ReorderAlerts = lazy(() => import('./components/ReorderAlerts'))
const Suppliers = lazy(() => import('./components/Suppliers'))
const PurchaseOrders = lazy(() => import('./components/PurchaseOrders'))

import type { InventoryFilters as Filters, InventorySortOptions } from './types'
import InventoryFilters from './components/InventoryFilters'
import InventoryMetrics from './components/InventoryMetrics'
import ItemDetailDrawer from './components/ItemDetailDrawer'
import StockMovementDialog from '../../components/StockMovementDialog'
import type { InventoryItem } from '../../../../shared/types'
import logger from '../../../../shared/utils/logger'

const ITEMS_PER_PAGE = 50

type TabType = 'products' | 'analytics' | 'history' | 'reorder' | 'suppliers' | 'purchase-orders'

interface PrefilledPurchaseOrder {
  productId: string
  variantId: string
  productName: string
  variantName: string
  suggestedQty: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [prefilledPurchaseOrder, setPrefilledPurchaseOrder] = useState<PrefilledPurchaseOrder | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [isExporting, setIsExporting] = useState(false)
  
  // Stock movement dialog state
  const [stockMovementDialog, setStockMovementDialog] = useState<{
    isOpen: boolean
    variantId: string | null
    productName: string
    variantLabel: string
    currentStock: number
  }>({ 
    isOpen: false, 
    variantId: null, 
    productName: '', 
    variantLabel: '', 
    currentStock: 0 
  })
  
  // Get display settings for image loading
  const { settings: displaySettings } = useDisplaySettings()
  
  // Load filter metadata (categories, colors, sizes)
  const { metadata: filterMetadata } = useFilterMetadata()
  
  // Extract category names from metadata
  const categories = filterMetadata?.categories?.map((c: any) => c.name) || []
  
  // Handler for creating purchase order from reorder alert
  const handleCreatePurchaseOrderFromAlert = (alertData: PrefilledPurchaseOrder) => {
    setPrefilledPurchaseOrder(alertData)
    setActiveTab('purchase-orders')
  }
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    search: '',
    categories: [],
    stockStatus: [],
    storeId: undefined,
    priceRange: { min: 0, max: Infinity },
    stockRange: { min: 0, max: Infinity }
  })

  // Sort state
  const [sortOptions, setSortOptions] = useState<InventorySortOptions>({
    field: 'name',
    direction: 'asc'
  })

  // Debounce search query (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Memoize filters object to prevent unnecessary re-renders
  const searchFilters = useMemo(() => ({
    query: debouncedSearch,
    categoryIds: filters.categories,
    storeId: filters.storeId,
    stockStatus: filters.stockStatus.length > 0 ? filters.stockStatus as any : undefined,
    priceRange: filters.priceRange.min > 0 || filters.priceRange.max < Infinity ? filters.priceRange : undefined
  }), [debouncedSearch, filters.categories, filters.storeId, filters.stockStatus, filters.priceRange])

  // Memoize sort options
  const searchSort = useMemo(() => ({
    field: sortOptions.field,
    direction: sortOptions.direction
  }), [sortOptions.field, sortOptions.direction])

  // Backend search with filters - Use search:inventory for enriched data with metrics
  const {
    data: items,
    loading,
    error,
    totalCount,
    pagination,
    metrics,
    refetch
  } = useBackendSearch<InventoryItem>({
    endpoint: 'search:inventory',
    filters: searchFilters,
    sort: searchSort,
    options: {
      debounceMs: 300,
      limit: ITEMS_PER_PAGE,
      includeImages: displaySettings.showImagesInInventory,  // Controlled by display settings
      includeMetrics: true  // Get metrics for dashboard
    }
  })
  
  // Toast notifications
  const toast = useToast()
  
  // Optimistic updates for delete operations
  const { execute: executeDelete, isOptimistic: isDeleting } = useOptimisticUpdate({
    onSuccess: () => {
      toast.success('Item deleted successfully - The item has been removed from inventory')
    },
    onError: (error) => {
      toast.error(`Failed to delete item: ${error.message}`)
    }
  })

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
    pagination.setPage(1)
  }

  // Update search query (debounced search will trigger after 300ms)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    pagination.setPage(1)
  }

  const handleSortChange = (options: InventorySortOptions) => {
    setSortOptions(options)
    pagination.setPage(1)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      // Prepare data for export
      const exportData = items.map(item => ({
        'Product Name': item.name,
        'SKU': item.baseSKU,
        'Category': item.category || 'Uncategorized',
        'Base Price': item.basePrice.toFixed(2),
        'Total Stock': item.totalStock,
        'Stock Value': item.stockValue.toFixed(2),
        'Retail Value': item.retailValue.toFixed(2),
        'Potential Profit': (item.retailValue - item.stockValue).toFixed(2),
        'Variants': item.variantCount,
        'Status': item.stockStatus,
        'Description': item.description || ''
      }))

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

      // Auto-size columns
      const maxWidth = 50
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...exportData.map(row => String(row[key as keyof typeof row] || '').length)
          ),
          maxWidth
        )
      }))
      ws['!cols'] = colWidths

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      const filename = `inventory-export-${date}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      toast.success(`Export completed: ${items.length} items exported to ${filename}`)
    } catch (error) {
      logger.error('Export error:', error)
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleAddItem = () => {
    navigate('/products?create=true')
  }
  
  /**
   * Handle stock movement recording
   */
  const handleStockMovement = async (data: {
    mode: 'add' | 'set' | 'remove'
    value: number
    reason: string
    notes: string
  }) => {
    try {
      if (!stockMovementDialog.variantId) {
        toast.error('No variant selected')
        return
      }

      const result = await window.api?.stockMovements?.record({
        variantId: stockMovementDialog.variantId,
        mode: data.mode,
        value: data.value,
        reason: data.reason,
        notes: data.notes,
        userId: user?.id
      })

      if (result?.success) {
        toast.success(`Stock ${data.mode === 'add' ? 'added' : data.mode === 'remove' ? 'removed' : 'updated'} successfully`)
        refetch() // Refresh inventory list
        setStockMovementDialog(prev => ({ ...prev, isOpen: false }))
      } else {
        toast.error(result?.error || 'Failed to record stock movement')
      }
    } catch (error) {
      logger.error('Error recording stock movement:', error)
      toast.error('Failed to record stock movement')
    }
  }

  /**
   * Handle delete with optimistic update
   */
  const handleDeleteItem = async (id: string) => {
    await executeDelete({
      operation: async () => {
        // @ts-ignore
        const result = await (globalThis as any).api?.products?.delete(id)
        if (!result?.success) {
          throw new Error(result?.message || 'Failed to delete item')
        }
        return result
      },
      optimisticUpdate: () => {
        // Immediately refresh the list (will show item removed)
        refetch()
      },
      rollback: () => {
        // Refresh again to restore the item if delete failed
        refetch()
      },
      description: `delete item ${id}`
    })
  }

  // Keyboard shortcuts for inventory page
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: handleAddItem,
      description: 'Create new item'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => void handleExport(),
      description: 'Export inventory'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: refetch,
      description: 'Refresh inventory data'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => setShowFilters(!showFilters),
      description: 'Toggle filters'
    }
  ])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" role="alert" aria-live="assertive">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-error" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Inventory</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <button 
            onClick={refetch} 
            className="btn-primary"
            aria-label="Retry loading inventory"
          >
            <RefreshCw size={18} aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg" aria-hidden="true">
              <Package className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('inventoryManagement')}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('inventoryTrackStock')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" role="toolbar" aria-label="Inventory actions">
            {activeTab === 'products' && (
              <>
                <button
                  onClick={refetch}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                  aria-label={loading ? t('inventoryRefreshing') : t('inventoryRefreshData')}
                  aria-busy={loading}
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                  {t('inventoryRefreshData')}
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || items.length === 0}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isExporting ? t('inventoryExporting') : `${t('inventoryExportExcel')} ${items.length}`}
                  aria-busy={isExporting}
                  aria-disabled={items.length === 0}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" aria-hidden="true" />
                      {t('inventoryExporting')}
                    </>
                  ) : (
                    <>
                      <Download size={18} aria-hidden="true" />
                      {t('inventoryExportExcel')} ({items.length})
                    </>
                  )}
                </button>
                <button
                  onClick={handleAddItem}
                  className="btn-primary flex items-center gap-2"
                  aria-label="Add new inventory item"
                >
                  <Plus size={18} aria-hidden="true" />
                  Add Item
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'products'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <Package size={18} />
            {t('inventoryProducts')}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'analytics'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <TrendingUp size={18} />
            {t('inventoryAnalytics')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <History size={18} />
            {t('inventoryHistory')}
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'reorder'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <AlertTriangle size={18} />
            {t('inventoryReorder')}
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'suppliers'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <Users size={18} />
            {t('inventorySuppliers')}
          </button>
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'purchase-orders'
                ? 'bg-primary text-white shadow-md transform scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.01]'
            }`}
          >
            <ShoppingCart size={18} />
            Purchase Orders
          </button>
        </div>

        {/* Search and Filters - Only show for products tab */}
        {activeTab === 'products' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t('inventorySearchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  aria-label={t('inventorySearchPlaceholder')}
                  role="searchbox"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'bg-primary text-white border-primary'
                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                aria-label={showFilters ? t('inventoryHideFilters') : t('inventoryShowFilters')}
                aria-expanded={showFilters}
                aria-controls="inventory-filters"
              >
                <Filter size={18} aria-hidden="true" />
                {t('inventoryFilters')}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <section id="inventory-filters" aria-label="Inventory filters">
                <InventoryFilters
                  categories={categories}
                  stores={filterMetadata?.stores}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </section>
            )}
          </>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'products' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Inventory Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <InventoryTable
                  items={items}
                  loading={loading}
                  sortOptions={sortOptions}
                  onSortChange={handleSortChange}
                  onItemClick={setSelectedItem}
                />
              </div>
              
              {/* Pagination */}
              {!loading && items.length > 0 && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={totalCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={pagination.setPage}
                />
              )}
            </div>

            {/* Metrics Sidebar */}
            <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
              <InventoryMetrics metrics={metrics} loading={loading} items={items} />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading Analytics...</p>
                </div>
              </div>
            }>
              <ProductAnalytics />
            </Suspense>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Loading Stock History...</p>
                </div>
              </div>
            }>
              <StockHistory />
            </Suspense>
          </div>
        )}

        {activeTab === 'reorder' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            <Suspense fallback={
              <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading Reorder Alerts...</p>
              </div>
            }>
              <ReorderAlerts onCreatePurchaseOrder={handleCreatePurchaseOrderFromAlert} />
            </Suspense>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            <Suspense fallback={
              <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading Suppliers...</p>
              </div>
            }>
              <Suppliers />
            </Suspense>
          </div>
        )}

        {activeTab === 'purchase-orders' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            <Suspense fallback={
              <div className="text-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading Purchase Orders...</p>
              </div>
            }>
              <PurchaseOrders 
                prefilledData={prefilledPurchaseOrder}
                onClearPrefilled={() => setPrefilledPurchaseOrder(null)}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Item Detail Drawer */}
      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRefresh={refetch}
          onDelete={handleDeleteItem}
          isDeleting={isDeleting}
          onAdjustStock={(variantId, productName, variantLabel, currentStock) => {
            setStockMovementDialog({
              isOpen: true,
              variantId,
              productName,
              variantLabel,
              currentStock
            })
          }}
        />
      )}
      
      {/* Stock Movement Dialog */}
      <StockMovementDialog
        isOpen={stockMovementDialog.isOpen}
        onClose={() => setStockMovementDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleStockMovement}
        productName={stockMovementDialog.productName}
        variantLabel={stockMovementDialog.variantLabel}
        currentStock={stockMovementDialog.currentStock}
      />
    </div>
  )
}
