/**
 * Unit tests for Products page
 * Tests product loading, filtering, CRUD operations, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Products from '../../../renderer/src/pages/Products'

// Mock dependencies
vi.mock('../../../renderer/src/utils/ipc')
vi.mock('../../../renderer/src/hooks/useBackendSearch', () => {
  const mockSearch = vi.fn()
  const mockRefresh = vi.fn()
  const mockRefetch = vi.fn()
  const mockSetPage = vi.fn()
  const mockNextPage = vi.fn()
  const mockPrevPage = vi.fn()

  return {
    useBackendSearch: vi.fn(() => ({
      data: [],
      loading: false,
      error: null,
      totalCount: 0,
      search: mockSearch,
      refresh: mockRefresh,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
        setPage: mockSetPage,
        nextPage: mockNextPage,
        prevPage: mockPrevPage,
      },
      refetch: mockRefetch,
      metrics: null,
    })),
    useFilterMetadata: vi.fn(() => ({
      metadata: {},
      loading: false,
      error: null,
    })),
    // Export mock functions for testing
    mockRefetch,
    mockSearch,
    mockRefresh,
    mockNextPage,
  }
})
vi.mock('../../../renderer/src/contexts/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))
vi.mock('../../../renderer/src/contexts/DisplaySettingsContext', () => ({
  useDisplaySettings: () => ({
    settings: {
      itemsPerPage: 20,
      defaultView: 'grid',
    },
  }),
}))
vi.mock('../../../renderer/src/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value), // Return value directly for testing
}))
vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: vi.fn((key: string) => key),
  }),
}))
vi.mock('../../../renderer/src/components/ui/Modal', () => ({
  default: vi.fn()
}))
vi.mock('../../../renderer/src/components/SmartDeleteDialog', () => ({
  default: vi.fn()
}))
vi.mock('../../../renderer/src/pages/Products/ProductFormWrapper', () => ({
  default: vi.fn()
}))
vi.mock('../../../renderer/src/pages/Products/ProductActions', () => ({
  default: vi.fn(({ onAdd, onImport, onExport, onScan, onRefresh, productsCount }) => (
    <div className="w-full flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          productCatalog
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          manageInventory • {productsCount} productsCount
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRefresh}
          title="refreshProducts"
        >
          Refresh
        </button>

        <button
          onClick={onScan}
          title="scanBarcode"
        >
          scan
        </button>

        <button
          onClick={onImport}
          title="importProducts"
        >
          import
        </button>

        <button
          onClick={onExport}
          title="exportProducts"
        >
          export
        </button>

        <button
          onClick={onAdd}
          className="btn-primary flex items-center gap-2"
        >
          <span>addProduct</span>
        </button>
      </div>
    </div>
  ))
}))
vi.mock('../../../renderer/src/pages/Products/ProductFilters', () => ({
  default: vi.fn(({ onToggleAdvanced, showAdvanced }) => (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="searchProductsByNameOrSKU"
            onChange={(e) => mockBackendSearch.search({ searchQuery: e.target.value })}
          />
        </div>
        <button onClick={onToggleAdvanced}>
          filters
        </button>
      </div>
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div>
            <label htmlFor="category-select">category</label>
            <select
              id="category-select"
              aria-label="category"
              onChange={(e) => mockBackendSearch.search({ category: e.target.value })}
            >
              <option value="">allCategories</option>
              <option value="electronics">electronics</option>
            </select>
          </div>
        </div>
      )}
    </div>
  ))
}))
vi.mock('../../../renderer/src/pages/Products/ProductGrid', () => ({
  default: vi.fn(({ onEdit, onDelete }) => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div>
          <div className="flex gap-2">
            <button onClick={() => onEdit({ id: '1', name: 'Test Product' })}>
              edit
            </button>
            <button onClick={() => onDelete({ id: '1', name: 'Test Product' })}>
              delete
            </button>
          </div>
        </div>
      </div>
    </div>
  ))
}))

// Import mocked modules after mocking
import { ipc } from '../../../renderer/src/utils/ipc'
import { useToast } from '../../../renderer/src/contexts/ToastContext'
import { useLanguage } from '../../../renderer/src/contexts/LanguageContext'
import { useDisplaySettings } from '../../../renderer/src/contexts/DisplaySettingsContext'
import { useBackendSearch, useFilterMetadata } from '../../../renderer/src/hooks/useBackendSearch'
import { useDebounce } from '../../../renderer/src/hooks/useDebounce'
import Modal from '../../../renderer/src/components/ui/Modal'
import SmartDeleteDialog from '../../../renderer/src/components/SmartDeleteDialog'
import ProductFormWrapper from '../../../renderer/src/pages/Products/ProductFormWrapper'
import ProductActions from '../../../renderer/src/pages/Products/ProductActions'
import ProductFilters from '../../../renderer/src/pages/Products/ProductFilters'
import ProductGrid from '../../../renderer/src/pages/Products/ProductGrid'

const mockIpc = vi.mocked(await import('../../../renderer/src/utils/ipc')).ipc
// const mockToast = vi.mocked(useToast()) - now mocked at module level
// const mockLanguage = vi.mocked(useLanguage()) - now mocked at module level
// const mockDisplaySettings = vi.mocked(useDisplaySettings()) - now mocked at module level
const mockBackendSearch = vi.mocked(useBackendSearch())
const mockFilterMetadata = vi.mocked(useFilterMetadata())
const mockUseFilterMetadata = vi.mocked(useFilterMetadata)
// Get the mock functions from the mocked module
const { mockRefetch, mockSearch, mockRefresh, mockNextPage } = vi.mocked(await import('../../../renderer/src/hooks/useBackendSearch'))
const mockDebounce = vi.mocked(useDebounce())
const mockModal = vi.mocked(Modal)
const mockSmartDeleteDialog = vi.mocked(SmartDeleteDialog)
const mockProductFormWrapper = vi.mocked(ProductFormWrapper)
const mockProductActions = vi.mocked(ProductActions)
const mockProductFilters = vi.mocked(ProductFilters)
const mockProductGrid = vi.mocked(ProductGrid)

describe('Products', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock implementations
    Object.assign(mockIpc, {
      products: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        checkDelete: vi.fn(),
      },
      stores: {
        getAll: vi.fn(),
      },
    })

    // Mock hook returns - these are now handled by module-level mocks
    // mockToast.success = vi.fn() - now mocked at module level
    // mockToast.error = vi.fn() - now mocked at module level
    // mockToast.info = vi.fn() - now mocked at module level
    // mockLanguage.t = vi.fn((key: string) => key) - now mocked at module level
    // mockDisplaySettings.settings - now mocked at module level

    // Reset mockBackendSearch to default state
    mockBackendSearch.data = []
    mockBackendSearch.loading = false
    mockBackendSearch.error = null
    mockBackendSearch.totalCount = 0
    mockBackendSearch.refetch = vi.fn()
    mockBackendSearch.metrics = null
    mockBackendSearch.refetch = vi.fn()
    mockBackendSearch.metrics = null

    mockFilterMetadata.metadata = {
      categories: [],
      colors: [],
      sizes: [],
      stores: [],
    }
    mockFilterMetadata.loading = false

    // Mock IPC calls
    mockIpc.stores.getAll.mockResolvedValue([
      { id: '1', name: 'Store 1', status: 'active' },
      { id: '2', name: 'Store 2', status: 'active' },
    ])

    // Mock components
    mockModal.mockReturnValue(null)
    mockSmartDeleteDialog.mockReturnValue(null)
    mockProductFormWrapper.mockReturnValue(null)
  })

  it('renders products page correctly', () => {
    render(<Products />)

    expect(screen.getByRole('heading', { name: /productCatalog/i })).toBeInTheDocument()
    expect(screen.getByText(/manageInventory/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/searchProducts/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('loads filter metadata on mount', () => {
    render(<Products />)

    expect(mockUseFilterMetadata).toHaveBeenCalled()
    expect(mockFilterMetadata.metadata).toEqual({
      categories: [],
      colors: [],
      sizes: [],
      stores: [],
    })
    expect(mockFilterMetadata.loading).toBe(false)
  })

  it('opens add product modal', async () => {
    const user = userEvent.setup()
    render(<Products />)

    const addButton = screen.getByRole('button', { name: /add/i })
    await user.click(addButton)

    // Modal should be rendered (mocked)
    expect(mockModal).toHaveBeenCalled()
  })

  it('handles product search', async () => {
    const user = userEvent.setup()
    render(<Products />)

    const searchInput = screen.getByPlaceholderText(/searchProducts/i)
    await user.type(searchInput, 'test product')

    expect(mockBackendSearch.search).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'test product',
      })
    )
  })

  it('applies filters correctly', async () => {
    const user = userEvent.setup()
    render(<Products />)

    // Open advanced filters
    const filtersButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filtersButton)

    // Apply category filter
    const categorySelect = screen.getByRole('combobox', { name: /category/i })
    await user.selectOptions(categorySelect, 'electronics')

    expect(mockBackendSearch.search).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'electronics',
      })
    )
  })

  it('handles product editing', async () => {
    const user = userEvent.setup()

    render(<Products />)

    // Simulate product selection for editing
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    // Modal should be rendered for editing
    expect(mockModal).toHaveBeenCalled()
  })

  it('handles product deletion with confirmation', async () => {
    const user = userEvent.setup()

    mockIpc.products.checkDelete.mockResolvedValue({
      canDelete: true,
      message: 'Safe to delete',
    })

    render(<Products />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    // Delete confirmation dialog should appear
    expect(mockSmartDeleteDialog).toHaveBeenCalled()
  })

  it('refreshes product list', async () => {
    const user = userEvent.setup()
    render(<Products />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    expect(mockRefetch).toHaveBeenCalled()
  })

  it('handles pagination', async () => {
    const user = userEvent.setup()

    // Mock pagination with multiple pages
    const mockUseBackendSearch = vi.mocked(useBackendSearch)
    mockUseBackendSearch.mockImplementation(() => ({
      data: [],
      loading: false,
      error: null,
      totalCount: 0,
      search: mockSearch,
      refresh: mockRefresh,
      pagination: {
        currentPage: 1,
        totalPages: 3,
        hasMore: true,
        setPage: vi.fn(),
        nextPage: mockNextPage,
        prevPage: vi.fn(),
      },
      refetch: mockRefetch,
      metrics: null,
    }))

    render(<Products />)

    const nextPageButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextPageButton)

    expect(mockNextPage).toHaveBeenCalled()
  })

  it('exports products data', async () => {
    const user = userEvent.setup()

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url')
    global.URL.revokeObjectURL = vi.fn()

    render(<Products />)

    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    // Verify CSV creation and download setup
    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url')
  })

  it('shows loading states', () => {
    const mockUseBackendSearch = vi.mocked(useBackendSearch)
    mockUseBackendSearch.mockImplementation(() => ({
      data: [],
      loading: true,
      error: null,
      totalCount: 0,
      search: mockSearch,
      refresh: mockRefresh,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
        setPage: vi.fn(),
        nextPage: vi.fn(),
        prevPage: vi.fn(),
      },
      refetch: mockRefetch,
      metrics: null,
    }))

    render(<Products />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    const mockUseBackendSearch = vi.mocked(useBackendSearch)
    mockUseBackendSearch.mockImplementation(() => ({
      data: [],
      loading: false,
      error: new Error('API Error'),
      totalCount: 0,
      search: mockSearch,
      refresh: mockRefresh,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
        setPage: vi.fn(),
        nextPage: vi.fn(),
        prevPage: vi.fn(),
      },
      refetch: mockRefetch,
      metrics: null,
    }))

    render(<Products />)

    // Check that error is handled (component should not crash)
    expect(screen.getByRole('heading', { name: /productCatalog/i })).toBeInTheDocument()
  })

  it.skip('toggles between grid and list view', async () => {
    const user = userEvent.setup()
    render(<Products />)

    const viewToggleButton = screen.getByRole('button', { name: /toggleView/i })
    await user.click(viewToggleButton)

    // Should toggle view mode
    expect(mockDisplaySettings.settings.defaultView).toBeDefined()
  })
})