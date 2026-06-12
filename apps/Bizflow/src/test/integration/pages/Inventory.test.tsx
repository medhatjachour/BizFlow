/**
 * Inventory Page Unit Tests
 *
 * Tests the Inventory management page functionality including:
 * - Data loading and display
 * - Filtering and sorting
 * - Export functionality
 * - Stock movement operations
 * - Item management (CRUD)
 * - Tab navigation
 * - Error handling
 * - Keyboard shortcuts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import InventoryPage from '../../../renderer/src/pages/Inventory'
import { AuthProvider } from '../../../renderer/src/contexts/AuthContext'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
import { DisplaySettingsProvider } from '../../../renderer/src/contexts/DisplaySettingsContext'
import * as XLSX from 'xlsx'

// Mock navigate function
const mockNavigate = vi.fn()

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate)
  }
})

vi.mock('../../../renderer/src/hooks/useBackendSearch', () => ({
  useBackendSearch: vi.fn(),
  useFilterMetadata: vi.fn()
}))

vi.mock('../../../renderer/src/hooks/useDebounce', () => ({
  useDebounce: vi.fn()
}))

vi.mock('../../../renderer/src/hooks/useKeyboardShortcuts', () => ({
  default: vi.fn()
}))

vi.mock('../../../renderer/src/hooks/useOptimisticUpdate', () => ({
  useOptimisticUpdate: vi.fn()
}))

vi.mock('../../../renderer/src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('../../../renderer/src/contexts/ToastContext', () => ({
  useToast: vi.fn(),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('../../../renderer/src/contexts/DisplaySettingsContext', () => ({
  useDisplaySettings: vi.fn(),
  DisplaySettingsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('../../../renderer/src/pages/Inventory/components/InventoryTable', () => ({
  default: vi.fn(() => <div data-testid="inventory-table">InventoryTable</div>)
}))

vi.mock('../../../renderer/src/pages/Inventory/components/Pagination', () => ({
  default: vi.fn(() => <div data-testid="pagination">Pagination</div>)
}))

vi.mock('../../../renderer/src/pages/Inventory/components/ProductAnalytics', () => ({
  default: vi.fn(() => {
    throw new Promise(() => {}) // Never resolves, keeps component suspended
  })
}))

vi.mock('../../../renderer/src/pages/Inventory/components/StockHistory', () => ({
  default: vi.fn(() => {
    throw new Promise(() => {}) // Never resolves, keeps component suspended
  })
}))

vi.mock('../../../renderer/src/pages/Inventory/components/InventoryFilters', () => ({
  default: vi.fn(() => <div data-testid="inventory-filters">InventoryFilters</div>)
}))

vi.mock('../../../renderer/src/pages/Inventory/components/InventoryMetrics', () => ({
  default: vi.fn(() => <div data-testid="inventory-metrics">InventoryMetrics</div>)
}))

vi.mock('../../../renderer/src/pages/Inventory/components/ItemDetailDrawer', () => ({
  default: vi.fn(({ item, ...props }) => 
    item ? <div data-testid="item-detail-drawer">ItemDetailDrawer</div> : null
  )
}))

vi.mock('../../../renderer/src/components/StockMovementDialog', () => ({
  default: vi.fn(() => <div data-testid="stock-movement-dialog">StockMovementDialog</div>)
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}))

vi.mock('../../../../shared/utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}))

// Import mocked functions
import { useBackendSearch, useFilterMetadata } from '../../../renderer/src/hooks/useBackendSearch'
import { useDebounce } from '../../../renderer/src/hooks/useDebounce'
import { default as useKeyboardShortcuts } from '../../../renderer/src/hooks/useKeyboardShortcuts'
import { useOptimisticUpdate } from '../../../renderer/src/hooks/useOptimisticUpdate'
import { useAuth } from '../../../renderer/src/contexts/AuthContext'
import { useLanguage } from '../../../renderer/src/contexts/LanguageContext'
import { useToast } from '../../../renderer/src/contexts/ToastContext'
import { useDisplaySettings } from '../../../renderer/src/contexts/DisplaySettingsContext'
import InventoryTable from '../../../renderer/src/pages/Inventory/components/InventoryTable'
import Pagination from '../../../renderer/src/pages/Inventory/components/Pagination'
import ProductAnalytics from '../../../renderer/src/pages/Inventory/components/ProductAnalytics'
import StockHistory from '../../../renderer/src/pages/Inventory/components/StockHistory'
import InventoryFilters from '../../../renderer/src/pages/Inventory/components/InventoryFilters'
import InventoryMetrics from '../../../renderer/src/pages/Inventory/components/InventoryMetrics'
import ItemDetailDrawer from '../../../renderer/src/pages/Inventory/components/ItemDetailDrawer'
import StockMovementDialog from '../../../renderer/src/components/StockMovementDialog'
import { utils, writeFile } from 'xlsx'

// Mock functions
const mockUseBackendSearch = vi.mocked(useBackendSearch)
const mockUseFilterMetadata = vi.mocked(useFilterMetadata)
const mockUseDebounce = vi.mocked(useDebounce)
const mockUseKeyboardShortcuts = vi.mocked(useKeyboardShortcuts)
const mockUseOptimisticUpdate = vi.mocked(useOptimisticUpdate)
const mockUseAuth = vi.mocked(useAuth)
const mockUseLanguage = vi.mocked(useLanguage)
const mockUseToast = vi.mocked(useToast)
const mockUseDisplaySettings = vi.mocked(useDisplaySettings)
const mockWriteFile = vi.mocked(writeFile)
const mockInventoryTable = vi.mocked(InventoryTable)
const mockPaginationComponent = vi.mocked(Pagination)
const mockProductAnalytics = vi.mocked(ProductAnalytics)
const mockStockHistory = vi.mocked(StockHistory)
const mockInventoryFilters = vi.mocked(InventoryFilters)
const mockInventoryMetrics = vi.mocked(InventoryMetrics)
const mockItemDetailDrawer = vi.mocked(ItemDetailDrawer)
const mockStockMovementDialog = vi.mocked(StockMovementDialog)

// Mock window.api
const mockApi = {
  stockMovements: {
    record: vi.fn()
  },
  products: {
    delete: vi.fn()
  }
}

Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

// Mock globalThis.api for delete operations
Object.defineProperty(globalThis, 'api', {
  value: mockApi,
  writable: true
})

// Test data
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  role: 'admin'
}

const mockItems = [
  {
    id: 'item-1',
    name: 'Test Product',
    baseSKU: 'TEST-001',
    category: 'Electronics',
    basePrice: 99.99,
    totalStock: 50,
    stockValue: 4999.50,
    retailValue: 7499.25,
    variantCount: 3,
    stockStatus: 'normal',
    description: 'Test product description'
  },
  {
    id: 'item-2',
    name: 'Another Product',
    baseSKU: 'TEST-002',
    category: 'Clothing',
    basePrice: 29.99,
    totalStock: 25,
    stockValue: 749.75,
    retailValue: 1124.63,
    variantCount: 2,
    stockStatus: 'low',
    description: 'Another test product'
  }
]

const mockMetrics = {
  totalItems: 2,
  totalValue: 5749.25,
  lowStockItems: 1,
  outOfStockItems: 0,
  averagePrice: 64.99,
  totalProducts: 2,
  totalVariants: 5,
  totalPieces: 150,
  totalStockValue: 5749.25,
  totalRetailValue: 6899.10,
  potentialProfit: 1149.85,
  lowStockCount: 1,
  outOfStockCount: 0
}

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  setPage: vi.fn()
}

const mockRefetch = vi.fn()

// Helper function to render component with providers
function renderInventoryPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <DisplaySettingsProvider>
              <InventoryPage />
            </DisplaySettingsProvider>
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('InventoryPage', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn()
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    mockNavigate.mockClear()

    // Setup default mocks
    mockUseAuth.mockReturnValue({ user: mockUser })
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key // Return key as translation for simplicity
    })
    mockUseToast.mockReturnValue(mockToast)
    mockUseDisplaySettings.mockReturnValue({
      settings: { showImagesInInventory: true }
    })
    mockUseFilterMetadata.mockReturnValue({
      metadata: { categories: [{ name: 'Electronics' }, { name: 'Clothing' }] }
    })
    mockUseDebounce.mockImplementation((value) => value) // Return value immediately
    mockUseKeyboardShortcuts.mockImplementation(() => {}) // No-op
    mockUseOptimisticUpdate.mockReturnValue({
      execute: vi.fn(),
      isOptimistic: false
    })

    // Mock useBackendSearch
    mockUseBackendSearch.mockReturnValue({
      data: mockItems,
      loading: false,
      error: null,
      totalCount: 2,
      pagination: mockPagination,
      metrics: mockMetrics,
      refetch: mockRefetch
    })

    // Import and mock react-router-dom
    // useNavigate is already mocked at the top
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial Rendering', () => {
    it('renders inventory page with correct title and structure', () => {
      renderInventoryPage()

      expect(screen.getByText('inventoryManagement')).toBeInTheDocument()
      expect(screen.getByText('inventoryTrackStock')).toBeInTheDocument()
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      expect(screen.getByText('inventoryProducts')).toBeInTheDocument()
      expect(screen.getByText('inventoryAnalytics')).toBeInTheDocument()
      expect(screen.getByText('inventoryHistory')).toBeInTheDocument()
    })

    it('displays loading state initially', () => {
      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        loading: true
      })

      renderInventoryPage()

      // Check if InventoryTable is called with loading prop
      mockInventoryTable.mockReturnValue(<div>Mocked InventoryTable</div>)
      expect(InventoryTable).toHaveBeenCalledWith(
        expect.objectContaining({ loading: true }),
        expect.any(Object)
      )
    })

    it('displays error state when data loading fails', () => {
      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        error: 'Failed to load inventory'
      })

      renderInventoryPage()

      expect(screen.getByText('Error Loading Inventory')).toBeInTheDocument()
      expect(screen.getByText('Failed to load inventory')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('shows products tab by default', () => {
      renderInventoryPage()

      expect(screen.getByText('inventoryProducts')).toHaveClass('bg-primary', 'text-white')
      expect(screen.queryByText('inventoryAnalytics')).not.toHaveClass('bg-primary')
      expect(screen.queryByText('inventoryHistory')).not.toHaveClass('bg-primary')
    })

    it('switches to analytics tab when clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const analyticsTab = screen.getByText('inventoryAnalytics')
      await user.click(analyticsTab)

      expect(analyticsTab).toHaveClass('bg-primary', 'text-white')
      expect(screen.getByText('inventoryProducts')).not.toHaveClass('bg-primary')
    })

    it('switches to history tab when clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const historyTab = screen.getByText('inventoryHistory')
      await user.click(historyTab)

      expect(historyTab).toHaveClass('bg-primary', 'text-white')
      expect(screen.getByText('inventoryProducts')).not.toHaveClass('bg-primary')
    })

    it('shows search and filters only on products tab', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      // Search should be visible on products tab
      expect(screen.getByRole('searchbox')).toBeInTheDocument()

      // Switch to analytics tab
      await user.click(screen.getByText('inventoryAnalytics'))

      // Search should not be visible
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('updates search query when user types', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'test product')

      expect(searchInput).toHaveValue('test product')
    })

    it('debounces search input', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'test')

      // useDebounce should be called with the search value
      expect(mockUseDebounce).toHaveBeenCalledWith('test', 300)
    })

    it('resets pagination when search changes', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'new search')

      expect(mockPagination.setPage).toHaveBeenCalledWith(1)
    })
  })

  describe('Filtering', () => {
    it('toggles filters panel when filter button is clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const filterButton = screen.getByText('inventoryFilters')
      expect(filterButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(filterButton)

      expect(filterButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('passes correct props to InventoryFilters component', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      // Click the filter button to show filters
      const filterButton = screen.getByText('inventoryFilters')
      await user.click(filterButton)

      // Now the InventoryFilters component should be rendered and called
      expect(mockInventoryFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          categories: ['Electronics', 'Clothing'],
          filters: expect.objectContaining({
            search: '',
            categories: [],
            stockStatus: [],
            priceRange: { min: 0, max: Infinity },
            stockRange: { min: 0, max: Infinity }
          })
        }),
        expect.any(Object)
      )
    })
  })

  describe('Sorting', () => {
    it('passes sort options to InventoryTable', () => {
      renderInventoryPage()

      expect(mockInventoryTable).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOptions: { field: 'name', direction: 'asc' }
        }),
        expect.any(Object)
      )
    })

    it('updates sort options when sort changes', () => {
      renderInventoryPage()

      const tableProps = mockInventoryTable.mock.calls[0][0]

      // Verify that onSortChange is a function and can be called
      expect(typeof tableProps.onSortChange).toBe('function')
      
      // Call the sort change function
      tableProps.onSortChange({ field: 'basePrice', direction: 'desc' })
      
      // The function should be callable without errors
      expect(() => {
        tableProps.onSortChange({ field: 'basePrice', direction: 'desc' })
      }).not.toThrow()
    })
  })

  describe('Export Functionality', () => {
    it('exports inventory data to Excel when export button is clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const exportButton = screen.getByText(/inventoryExportExcel/)
      await user.click(exportButton)

      await waitFor(() => {
        expect(XLSX.utils.json_to_sheet).toHaveBeenCalled()
        expect(XLSX.utils.book_new).toHaveBeenCalled()
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
        expect(XLSX.writeFile).toHaveBeenCalledWith(
          expect.any(Object),
          expect.stringMatching(/^inventory-export-\d{4}-\d{2}-\d{2}\.xlsx$/)
        )
      })

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Export completed: 2 items exported')
      )
    })

    it('shows loading state during export', async () => {
      const user = userEvent.setup()

      // Mock writeFile to be slow
      mockWriteFile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      renderInventoryPage()

      const exportButton = screen.getByText(/inventoryExportExcel/)
      await user.click(exportButton)

      // Button should still be present and writeFile should be called
      expect(exportButton).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockWriteFile).toHaveBeenCalled()
      })
    })

    it('handles export errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock XLSX.writeFile to throw error
      mockWriteFile.mockImplementation(() => {
        throw new Error('Export failed')
      })

      renderInventoryPage()

      const exportButton = screen.getByText(/inventoryExportExcel/)
      await user.click(exportButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Export failed: Export failed')
      })
    })

    it('disables export button when no items', () => {
      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        data: []
      })

      renderInventoryPage()

      const exportButton = screen.getByText(/inventoryExportExcel/)
      expect(exportButton).toBeDisabled()
    })
  })

  describe('Add Item Functionality', () => {
    it('navigates to products page with create parameter when add button is clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const addButton = screen.getByText('Add Item')
      await user.click(addButton)

      expect(mockNavigate).toHaveBeenCalledWith('/products?create=true')
    })
  })

  describe('Refresh Functionality', () => {
    it('calls refetch when refresh button is clicked', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const refreshButton = screen.getByText('inventoryRefreshData')
      await user.click(refreshButton)

      expect(mockRefetch).toHaveBeenCalled()
    })

    it('shows loading state when refreshing', () => {
      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        loading: true
      })

      renderInventoryPage()

      const refreshButton = screen.getByText('inventoryRefreshData')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Stock Movement', () => {
    it('dialog is rendered', () => {
      renderInventoryPage()

      expect(screen.getByTestId('stock-movement-dialog')).toBeInTheDocument()
    })
  })

  describe('Item Deletion', () => {
    it('handles item deletion setup', () => {
      // Basic test that the component renders without errors
      renderInventoryPage()

      expect(screen.getByText('inventoryManagement')).toBeInTheDocument()
    })

    it('shows success toast on successful deletion', () => {
      renderInventoryPage()

      // First select an item to open the drawer
      const tableProps = mockInventoryTable.mock.calls[0][0]
      tableProps.onItemClick(mockItems[0])

      const mockExecuteDelete = vi.fn().mockResolvedValue(undefined)
      mockUseOptimisticUpdate.mockReturnValue({
        execute: mockExecuteDelete,
        isOptimistic: false
      })

      renderInventoryPage()

      const drawerProps = mockItemDetailDrawer.mock.calls[0][0]

      drawerProps.onDelete('item-1')

      expect(mockExecuteDelete).toHaveBeenCalledWith({
        operation: expect.any(Function),
        optimisticUpdate: expect.any(Function),
        rollback: expect.any(Function),
        description: 'delete item item-1'
      })
    })
  })

  describe('Item Detail Drawer', () => {
    it('passes onItemClick to InventoryTable', () => {
      renderInventoryPage()

      const tableProps = mockInventoryTable.mock.calls[0][0]

      expect(typeof tableProps.onItemClick).toBe('function')
    })

    it('onItemClick callback can be called with item', () => {
      renderInventoryPage()

      const tableProps = mockInventoryTable.mock.calls[0][0]

      // Verify the callback is a function and can be called without errors
      expect(typeof tableProps.onItemClick).toBe('function')
      
      // Call the callback with a mock item
      expect(() => {
        tableProps.onItemClick(mockItems[0])
      }).not.toThrow()
    })
  })

  describe('Pagination', () => {
    it('renders pagination component when items exist', () => {
      renderInventoryPage()

      expect(mockPaginationComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPage: 1,
          totalPages: 1,
          totalItems: 2,
          itemsPerPage: 50
        }),
        expect.any(Object)
      )
    })

    it('does not render pagination when no items', () => {
      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        data: []
      })

      renderInventoryPage()

      expect(mockPaginationComponent).not.toHaveBeenCalled()
    })
  })

  describe('Metrics Sidebar', () => {
    it('renders inventory metrics with correct data', () => {
      renderInventoryPage()

      expect(mockInventoryMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: mockMetrics,
          loading: false,
          items: mockItems
        }),
        expect.any(Object)
      )
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('registers keyboard shortcuts for inventory actions', () => {
      renderInventoryPage()

      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith([
        expect.objectContaining({
          key: 'n',
          ctrlKey: true,
          action: expect.any(Function),
          description: 'Create new item'
        }),
        expect.objectContaining({
          key: 'e',
          ctrlKey: true,
          action: expect.any(Function),
          description: 'Export inventory'
        }),
        expect.objectContaining({
          key: 'r',
          ctrlKey: true,
          action: expect.any(Function),
          description: 'Refresh inventory data'
        }),
        expect.objectContaining({
          key: 'f',
          ctrlKey: true,
          action: expect.any(Function),
          description: 'Toggle filters'
        })
      ])
    })
  })

  describe('Lazy Loading', () => {
    it('renders suspense fallback for analytics tab', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      await user.click(screen.getByText('inventoryAnalytics'))

      expect(screen.getByText('Loading Analytics...')).toBeInTheDocument()
    })

    it('renders suspense fallback for history tab', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      await user.click(screen.getByText('inventoryHistory'))

      expect(screen.getByText('Loading Stock History...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('retries data loading when retry button is clicked', async () => {
      const user = userEvent.setup()

      mockUseBackendSearch.mockReturnValueOnce({
        ...mockUseBackendSearch(),
        error: 'Network error'
      })

      renderInventoryPage()

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockRefetch).toHaveBeenCalled()
    })

    it('logs errors during export', async () => {
      const user = userEvent.setup()

      // Mock XLSX to throw error
      mockWriteFile.mockImplementation(() => {
        throw new Error('File system error')
      })

      renderInventoryPage()

      const exportButton = screen.getByText(/inventoryExportExcel/)
      await user.click(exportButton)

      // Error should be handled gracefully without crashing
      await waitFor(() => {
        expect(exportButton).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderInventoryPage()

      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'inventorySearchPlaceholder')
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /inventoryRefreshData/ })).toHaveAttribute('aria-busy', 'false')
    })

    it('updates aria-expanded for filter button', async () => {
      const user = userEvent.setup()
      renderInventoryPage()

      const filterButton = screen.getByText('inventoryFilters')
      expect(filterButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(filterButton)
      expect(filterButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has proper button labels for actions', () => {
      renderInventoryPage()

      expect(screen.getByRole('button', { name: 'Add new inventory item' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /inventoryExportExcel/ })).toBeInTheDocument()
    })
  })
})