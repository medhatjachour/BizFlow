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
import { Search, Filter, Download, Plus, RefreshCw, Package, AlertTriangle, TrendingUp, History, Users, ShoppingCart, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBackendSearch, useFilterMetadata } from '@renderer/hooks/useBackendSearch'
import { useDebounce } from '@renderer/hooks/useDebounce'
import useKeyboardShortcuts from '@renderer/hooks/useKeyboardShortcuts'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDisplaySettings } from '@renderer/contexts/DisplaySettingsContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import * as XLSX from 'xlsx'

// Lazy load heavy components - only load when tabs are clicked

const Suppliers = lazy(() => import('./components/Suppliers'))
const PurchaseOrders = lazy(() => import('./components/PurchaseOrders'))

import type { InventoryFilters as Filters, InventorySortOptions } from './types'

import type { InventoryItem } from '@/shared/types'
import logger from '@/shared/utils/logger'

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
  const [activeTab, setActiveTab] = useState<TabType>('suppliers')
  const [prefilledPurchaseOrder, setPrefilledPurchaseOrder] = useState<PrefilledPurchaseOrder | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
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


  /**
   * Handle delete with optimistic update
   */
  
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


        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          
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
       
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
    


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

    
    </div>
  )
}
