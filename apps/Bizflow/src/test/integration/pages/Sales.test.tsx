/**
 * Unit tests for Sales page
 * Tests sales data loading, filtering, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Sales from '../../../renderer/src/pages/Sales'

// Mock dependencies
vi.mock('../../../renderer/src/utils/ipc')
vi.mock('../../../renderer/src/components/Pagination')
vi.mock('../../../renderer/src/utils/formatNumber')
vi.mock('../../../renderer/src/pages/Sales/RefundItemsModal')
vi.mock('../../../renderer/src/components/InstallmentManager')
vi.mock('@/shared/utils/refundCalculations')
vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: vi.fn((key: string) => key),
  }),
}))
vi.mock('../../../renderer/src/contexts/ToastContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useToast: () => mockToast,
  }
})
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({ search: '' }),
  }
})

// Import mocked modules after mocking
import { ipc } from '../../../renderer/src/utils/ipc'
import Pagination from '../../../renderer/src/components/Pagination'
import * as formatNumber from '../../../renderer/src/utils/formatNumber'
import RefundItemsModal from '../../../renderer/src/pages/Sales/RefundItemsModal'
import { InstallmentManager } from '../../../renderer/src/components/InstallmentManager'
import * as refundCalculations from '@/shared/utils/refundCalculations'

const mockIpc = vi.mocked(ipc)

const mockToast = {
  showToast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}

const renderSales = () => render(<BrowserRouter><ToastProvider><Sales /></ToastProvider></BrowserRouter>)

const mockLanguage = {
  t: vi.fn((key: string) => key), // Return key as translation for simplicity
}

describe('Sales', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock IPC
    mockIpc.saleTransactions.getByDateRange = vi.fn().mockReturnValue([])
    mockIpc.saleTransactions.getById = vi.fn()
    mockIpc.saleTransactions.refundItems = vi.fn()
    mockIpc.customers.getAll = vi.fn().mockReturnValue([])

    // Mock components
    const MockPagination = vi.mocked(Pagination)
    const MockRefundModal = vi.mocked(RefundItemsModal)
    const MockInstallmentManager = vi.mocked(InstallmentManager)

    MockPagination.mockReturnValue(<div>Pagination</div>)
    MockRefundModal.mockReturnValue(null)
    MockInstallmentManager.mockReturnValue(null)

    // Mock format functions
    vi.mocked(formatNumber.formatCurrency).mockImplementation((val) => `$${val}`)
    vi.mocked(formatNumber.formatLargeNumber).mockImplementation((val) => val.toString())

    // Mock refund calculations
    vi.mocked(refundCalculations.calculateRefundedAmount).mockReturnValue(0)
  })

  const renderSales = () => {
    return render(
      <BrowserRouter>
        <ToastProvider>
          <Sales />
        </ToastProvider>
      </BrowserRouter>
    )
  }

  it('renders sales page correctly', () => {
    renderSales()

    expect(screen.getByRole('heading', { name: /sales/i })).toBeInTheDocument()
    expect(screen.getByText(/salesHistory/i)).toBeInTheDocument()
  })

  it('loads sales data on mount', async () => {
    mockIpc.saleTransactions.getByDateRange.mockResolvedValue([])

    renderSales()

    await waitFor(() => {
      expect(mockIpc.saleTransactions.getByDateRange).toHaveBeenCalled()
    })
  })

  it('displays sales data in table', async () => {
    const mockSales = [
      {
        id: '1',
        total: 100,
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        customerName: 'John Doe',
        items: [],
        paymentMethod: 'cash',
      }
    ]

    mockIpc.saleTransactions.getByDateRange.mockResolvedValue(mockSales)
    mockIpc.customers.getAll.mockResolvedValue([])

    renderSales()

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getAllByText('$100')).toHaveLength(2)
    })
  })

  it('filters sales by date', async () => {
    const user = userEvent.setup()

    const mockSales = [
      { id: '1', total: 100, status: 'completed', createdAt: new Date().toISOString(), customerName: 'John', items: [], paymentMethod: 'cash' },
      { id: '2', total: 200, status: 'pending', createdAt: new Date(Date.now() - 86400000).toISOString(), customerName: 'Jane', items: [], paymentMethod: 'card' }, // Yesterday
    ]

    mockIpc.saleTransactions.getByDateRange.mockResolvedValue(mockSales)
    mockIpc.customers.getAll.mockResolvedValue([])

    renderSales()

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })

    // Filter by date (today - should show only today's sale)
    const dateFilter = screen.getByRole('combobox')
    await user.selectOptions(dateFilter, 'today')

    // Should show only today's sale
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.queryByText('Jane')).not.toBeInTheDocument()
  })

  it('searches sales by customer name', async () => {
    const user = userEvent.setup()

    const mockSales = [
      { id: '1', total: 100, status: 'completed', createdAt: new Date(Date.now() - 86400000).toISOString(), customerName: 'John Doe', items: [], paymentMethod: 'cash' },
      { id: '2', total: 200, status: 'completed', createdAt: new Date(Date.now() - 86400000).toISOString(), customerName: 'Jane Smith', items: [], paymentMethod: 'card' },
    ]

    mockIpc.saleTransactions.getByDateRange.mockResolvedValue(mockSales)
    mockIpc.customers.getAll.mockResolvedValue([])

    renderSales()

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Search for John
    const searchInput = screen.getByPlaceholderText(/searchByCustomerOrSaleId/i)
    await user.type(searchInput, 'John')

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
  })

  it('handles refresh button click', async () => {
    const user = userEvent.setup()

    mockIpc.saleTransactions.getByDateRange.mockResolvedValue([])
    mockIpc.customers.getAll.mockResolvedValue([])

    renderSales()

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    expect(mockIpc.saleTransactions.getByDateRange).toHaveBeenCalledTimes(2) // Initial + refresh
  })

  it('renders sales table with data', async () => {
    const mockSales = [
      {
        id: '1',
        total: 100,
        subtotal: 100,
        tax: 0,
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        customerName: 'John Doe',
        items: [],
        paymentMethod: 'cash',
        user: { username: 'test' },
      }
    ]

    mockIpc.saleTransactions.getByDateRange.mockReturnValue(mockSales)
    mockIpc.customers.getAll.mockReturnValue([])

    renderSales()

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('exports sales data', async () => {
    const user = userEvent.setup()

    const mockSales = [
      {
        id: '1',
        total: 100,
        subtotal: 100,
        tax: 0,
        status: 'completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        customerName: 'John Doe',
        items: [],
        paymentMethod: 'cash',
        user: { username: 'test' },
      }
    ]

    mockIpc.saleTransactions.getByDateRange.mockResolvedValue(mockSales)
    mockIpc.customers.getAll.mockResolvedValue([])

    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = vi.fn()

    renderSales()

    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    mockIpc.saleTransactions.getByDateRange.mockRejectedValue(new Error('API Error'))

    renderSales()

    await waitFor(() => {
      expect(mockToast.showToast).toHaveBeenCalledWith('error', 'Failed to load transactions')
    })
  })

  it('shows loading state initially', () => {
    renderSales()

    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
  })
})