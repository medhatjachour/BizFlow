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

import { useState, useMemo } from 'react'
import { Search, Filter, Download, Plus, RefreshCw, Package, AlertTriangle, TrendingUp, History, ChevronRight, ChevronLeft } from 'lucide-react'
import { useBackendSearch, useFilterMetadata } from '@renderer/hooks/useBackendSearch'
import { useDebounce } from '@renderer/hooks/useDebounce'
import useKeyboardShortcuts from '@renderer/hooks/useKeyboardShortcuts'
import { useOptimisticUpdate } from '@renderer/hooks/useOptimisticUpdate'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDisplaySettings } from '@renderer/contexts/DisplaySettingsContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import InventoryTable from './components/InventoryTable'
import Pagination from './components/Pagination'
import ProductAnalytics from '@renderer/plugins/commerce/pages/Inventory/components/ProductAnalytics'
import StockHistory from '@renderer/plugins/commerce/pages/Inventory/components/StockHistory'
import * as XLSX from 'xlsx'

import type { InventoryFilters as Filters, InventorySortOptions } from './types'
import InventoryFilters from './components/InventoryFilters'
import InventoryMetrics from './components/InventoryMetrics'
import ItemDetailDrawer from './components/ItemDetailDrawer'
import StockMovementDialog from '@renderer/components/StockMovementDialog'
import type { InventoryItem } from '@/shared/types'
import logger from '@/shared/utils/logger'

const ITEMS_PER_PAGE = 50

type TabType = 'products' | 'analytics' | 'history' 



export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
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
    sessionStorage.setItem(
      'bizflow:commerce:product-action',
      JSON.stringify({ mode: 'create' })
    )
    window.dispatchEvent(
      new CustomEvent('bizflow:commerce:open-tab', { detail: 'products' })
    )
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

  const activeFilterCount =
    filters.categories.length +
    filters.stockStatus.length +
    (filters.storeId ? 1 : 0) +
    (filters.priceRange.min > 0 || filters.priceRange.max < Infinity ? 1 : 0)

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" role="alert" aria-live="assertive">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-error" size={48} aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('inventoryUiErrorLoading')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <button 
            onClick={refetch} 
            className="btn-primary"
            aria-label={t('inventoryUiRetryLoading')}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {t('inventoryUiRetry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/70 dark:bg-slate-950">
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="px-4 lg:px-6 pt-4 pb-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-sm" aria-hidden="true">
              <Package size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-950 dark:text-white">{t('inventoryManagement')}</h1>
                {metrics && (metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800 text-[10px] font-bold">
                    <AlertTriangle size={11} />
                    {metrics.lowStockCount + metrics.outOfStockCount} {t('inventoryUiAlerts')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('inventoryTrackStock')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 border-y xl:border-y-0 border-slate-200 dark:border-slate-800 xl:min-w-[430px]">
            <div className="px-4 py-1 xl:py-0">
              <p className="text-[10px] font-semibold uppercase text-slate-400">{t('inventoryUiCatalog')}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{totalCount.toLocaleString()} {t('inventoryUiItems')}</p>
            </div>
            <div className="px-4 py-1 xl:py-0">
              <p className="text-[10px] font-semibold uppercase text-slate-400">{t('inventoryUiStockValue')}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                ${(metrics?.totalStockValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="px-4 py-1 xl:py-0">
              <p className="text-[10px] font-semibold uppercase text-slate-400">{t('inventoryUiUnitsOnHand')}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{(metrics?.totalPieces || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-6 flex items-end justify-between gap-4 border-t border-slate-100 dark:border-slate-800/70">
          <nav className="flex items-center gap-5 overflow-x-auto" aria-label={t('inventoryUiViews')}>
            {([
              { id: 'products', label: t('inventoryProducts'), icon: Package },
              { id: 'analytics', label: t('inventoryAnalytics'), icon: TrendingUp },
              { id: 'history', label: t('inventoryHistory'), icon: History }
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`relative inline-flex items-center gap-1.5 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                {label}
                {activeTab === id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'products' && (
          <div className="px-4 lg:px-6 py-3 border-t border-slate-100 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2" role="toolbar" aria-label={t('inventoryUiActions')}>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder={t('inventorySearchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  aria-label={t('inventorySearchPlaceholder')}
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                  }`}
                  aria-expanded={showFilters}
                  aria-controls="inventory-filters"
                >
                  <Filter size={15} />
                  {t('inventoryUiFilters')}
                  {activeFilterCount > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded bg-emerald-600 text-white text-[10px] inline-flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={refetch}
                  disabled={loading}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center disabled:opacity-50"
                  title={t('inventoryRefreshData')}
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting || items.length === 0}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400 inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                  {t('inventoryUiExport')}
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  <Plus size={15} />
                  {t('inventoryUiAddItem')}
                </button>
              </div>
            </div>

            {showFilters && (
              <section id="inventory-filters" aria-label={t('inventoryUiFilterControls')}>
                <InventoryFilters
                  categories={categories}
                  stores={filterMetadata?.stores}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
              </section>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/70 dark:bg-slate-950">
        {activeTab === 'products' && (
          <div className="flex-1 flex gap-3 p-3 overflow-hidden">
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
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

            <div className="relative hidden lg:flex shrink-0">
              <button
                type="button"
                onClick={() => setShowMetrics(!showMetrics)}
                className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-md shadow-sm text-slate-400 hover:text-emerald-600 transition-colors"
                aria-label={t(showMetrics ? 'inventoryUiHideInsights' : 'inventoryUiShowInsights')}
                title={t(showMetrics ? 'inventoryUiHideInsights' : 'inventoryUiShowInsights')}
              >
                {showMetrics ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </button>

              {showMetrics && (
                <div className="w-[300px] 2xl:w-80 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-y-auto shadow-sm">
                  <InventoryMetrics metrics={metrics} loading={loading} items={items} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100/70 dark:bg-slate-950">
            <ProductAnalytics />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100/70 dark:bg-slate-950">
            <StockHistory />
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
