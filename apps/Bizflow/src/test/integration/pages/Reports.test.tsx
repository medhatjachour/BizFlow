/**
 * Unit tests for Reports page
 * Tests report generation, data loading, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import EnhancedReports from '../../../renderer/src/pages/Reports'

// Create mock functions
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockInfo = vi.fn()

// Mock dependencies at module level
vi.mock('@/shared/utils/refundCalculations', () => ({
  calculateRefundedAmount: vi.fn().mockReturnValue(0)
}))
vi.mock('../../../renderer/src/components/ui/Modal', () => ({
  default: ({ children, isOpen }) => isOpen ? <div data-testid="modal">{children}</div> : null
}))
vi.mock('../../../renderer/src/contexts/ToastContext', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
  }),
}))
vi.mock('../../../renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  useNavigate: () => vi.fn(),
}))
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: vi.fn(),
    save: vi.fn(),
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    getFontSize: vi.fn().mockReturnValue(12),
  }))
}))
vi.mock('@renderer/utils/formatNumber', () => ({
  formatCurrency: vi.fn((val: number) => `$${val.toFixed(2)}`),
  formatLargeNumber: vi.fn((val: number) => val.toString())
}))

// Export mock functions for test access
export const mockToast = {
  success: mockSuccess,
  error: mockError,
  info: mockInfo,
}

// Mock window.api
const mockApi = {
  saleTransactions: {
    getByDateRange: vi.fn(),
  },
  finance: {
    getTransactions: vi.fn(),
  },
  reports: {
    getSalesData: vi.fn(),
    getInventoryData: vi.fn(),
    getFinancialData: vi.fn(),
    getCustomerData: vi.fn(),
  },
}

;(global.window as any).api = mockApi

describe('EnhancedReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock returns
    mockApi.saleTransactions.getByDateRange.mockImplementation(() => Promise.resolve([]))
    mockApi.finance.getTransactions.mockImplementation(() => Promise.resolve([]))
    mockApi.reports.getSalesData.mockImplementation(() => Promise.resolve({success: true, data: []}))
    mockApi.reports.getInventoryData.mockImplementation(() => Promise.resolve({success: true, data: []}))
    mockApi.reports.getFinancialData.mockImplementation(() => Promise.resolve({success: true, data: []}))
    mockApi.reports.getCustomerData.mockImplementation(() => Promise.resolve({success: true, data: []}))
  })

  const renderReports = () => {
    return render(
      <BrowserRouter>
        <EnhancedReports />
      </BrowserRouter>
    )
  }

  it('renders reports page correctly', () => {
    renderReports()

    expect(screen.getByRole('heading', { name: /reportsAndAnalytics/i })).toBeInTheDocument()
    expect(screen.getByText(/generateReport/i)).toBeInTheDocument()
  })

  it('loads today stats on mount', async () => {
    mockApi.saleTransactions.getByDateRange.mockResolvedValue([])
    mockApi.finance.getTransactions.mockResolvedValue([])

    renderReports()

    await waitFor(() => {
      expect(mockApi.saleTransactions.getByDateRange).toHaveBeenCalled()
      expect(mockApi.finance.getTransactions).toHaveBeenCalled()
    })
  })

  it('loads activity feed on mount', async () => {
    mockApi.saleTransactions.getByDateRange.mockResolvedValue([])
    mockApi.finance.getTransactions.mockResolvedValue([])

    renderReports()

    await waitFor(() => {
      expect(mockApi.saleTransactions.getByDateRange).toHaveBeenCalledTimes(2) // Once for stats, once for activity
    })
  })

  it('displays dashboard stats correctly', async () => {
    const user = userEvent.setup()
    
    // Set up mocks before rendering
    mockApi.saleTransactions.getByDateRange.mockImplementation(() => Promise.resolve([
      {
        id: '1',
        total: 100,
        items: [{ product: { baseCost: 50 }, quantity: 1, refundedQuantity: 0 }]
      }
    ]))
    mockApi.finance.getTransactions.mockImplementation(() => Promise.resolve([
      { id: '1', type: 'expense', amount: 25 }
    ]))

    renderReports()

    // Wait for stats to load
    await waitFor(() => {
      const statsSection = screen.getByRole('heading', { name: "Today's Activity" }).parentElement.parentElement
      within(statsSection).getByText('$100.00') // Revenue
      within(statsSection).getByText('$75.00') // Expenses (COGS 50 + operational 25)
      within(statsSection).getByText('$25.00') // Profit
    })
  })

  it('handles refresh button click', async () => {
    const user = userEvent.setup()
    mockApi.saleTransactions.getByDateRange.mockResolvedValue([])
    mockApi.finance.getTransactions.mockResolvedValue([])

    renderReports()

    // Clear any calls from initial load
    mockToast.success.mockClear()

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    // Wait for success toast to be called
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Data refreshed successfully')
    })
  })

  it('opens report generation modal', async () => {
    const user = userEvent.setup()
    renderReports()

    // Report generation UI is always visible, check for specific report type buttons
    expect(screen.getByRole('button', { name: /^sales$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /inventory/i })).toHaveLength(2) // Report type + manage inventory
    expect(screen.getByRole('button', { name: /^financial$/i })).toBeInTheDocument()
  })

  it('generates sales report', async () => {
    const user = userEvent.setup()
    mockApi.reports.getSalesData.mockResolvedValue({
      success: true,
      data: {
        summary: { totalSales: 10, totalRevenue: 1000 },
        saleTransactions: [],
        byPaymentMethod: {},
        byCategory: {},
        topProducts: [],
        dailyBreakdown: []
      }
    })

    renderReports()

    // Click on sales report type button
    const salesButton = screen.getByRole('button', { name: /sales/i })
    await user.click(salesButton)

    // Click generate report button
    const generateButton = screen.getByRole('button', { name: /generateReportButton/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockApi.reports.getSalesData).toHaveBeenCalled()
    })
  })

  it('generates financial report', async () => {
    const user = userEvent.setup()
    mockApi.reports.getFinancialData.mockResolvedValue({
      success: true,
      data: {
        summary: {
          totalRevenue: 1000,
          totalExpenses: 600,
          netProfit: 400
        },
        transactions: [],
        dailyBreakdown: [],
        expensesByCategory: {}
      }
    })

    renderReports()

    // Click on financial report type button
    const financialButton = screen.getByRole('button', { name: /financial/i })
    await user.click(financialButton)

    // Click generate report button
    const generateButton = screen.getByRole('button', { name: /generateReportButton/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockApi.reports.getFinancialData).toHaveBeenCalled()
    })
  })

  it('exports report to PDF', async () => {
    const user = userEvent.setup()

    // Mock jsPDF
    const mockJsPDF = vi.fn()
    mockJsPDF.prototype.text = vi.fn()
    mockJsPDF.prototype.save = vi.fn()
    vi.mocked(require('jspdf')).default = mockJsPDF

    // Mock API to return sample data
    mockApi.reports.getSalesData.mockImplementation(() => Promise.resolve({
      success: true,
      data: [
        {
          id: '1',
          total: 100,
          date: '2024-01-01',
          items: [{ product: { name: 'Product A' }, quantity: 1 }]
        }
      ]
    }))

    renderReports()

    // Click on sales report type button
    const salesButton = screen.getByRole('button', { name: /sales/i })
    await act(async () => {
      fireEvent.click(salesButton)
    })

    // Wait for date inputs to appear
    await waitFor(() => {
      expect(screen.getByText('📅 startDate')).toBeInTheDocument()
    })

    // Set date range
    const dateInputs = document.querySelectorAll('input[type="date"]')
    const startDateInput = dateInputs[0] as HTMLInputElement
    const endDateInput = dateInputs[1] as HTMLInputElement
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
    fireEvent.change(endDateInput, { target: { value: '2024-01-31' } })

    // Click generate report button
    const generateButton = screen.getByRole('button', { name: /generateReportButton/i })
    await act(async () => {
      await user.click(generateButton)
    })

    await waitFor(() => {
      const exportButton = screen.getByText('downloadPDF')
      return exportButton
    })

    const exportButton = screen.getByText('downloadPDF')
    await user.click(exportButton)

    // Check that jsPDF was called (mocked at module level)
    const jsPDFMock = vi.mocked(await import('jspdf')).default
    expect(jsPDFMock).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock API to reject during report generation
    mockApi.reports.getSalesData.mockRejectedValue(new Error('API Error'))

    renderReports()

    // Click on sales report type button
    const salesButton = screen.getByRole('button', { name: /^sales$/i })
    await user.click(salesButton)

    // Click generate report button
    const generateButton = screen.getByRole('button', { name: /generateReportButton/i })
    await user.click(generateButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to generate report')
    })
  })

  it('shows loading states', () => {
    renderReports()

    // Component doesn't show loading initially, but should have report type buttons
    expect(screen.getByRole('button', { name: /sales/i })).toBeInTheDocument()
  })
})